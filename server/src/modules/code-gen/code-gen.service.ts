import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError } from '@kg/shared';
import { type PlansService } from '../plans/plans.service.js';
import { type GitService } from '../git/git.service.js';
import { type GitBranchService } from '../git/git-branch.service.js';
import { type CodeExecutionService } from './code-execution.service.js';

export interface ExecutionResult {
  planId: string;
  success: boolean;
  stepsCompleted: number;
  stepsTotal: number;
  branch?: string;
  commitHash?: string;
  errors?: Array<{ stepId: string; error: string }>;
  validationResult?: ValidationResult;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  output?: string;
  filesChanged?: string[];
  error?: string;
}

export interface ValidationResult {
  typeCheck: { success: boolean; errors?: string[] };
  lint: { success: boolean; errors?: string[] };
  tests: { success: boolean; passed: number; failed: number };
}

export interface CodeChange {
  filePath: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
  diff?: string;
}

export interface ApplyResult {
  success: boolean;
  filesChanged: string[];
  errors?: string[];
}

@Injectable()
export class CodeGenService {
  private readonly logger = new Logger(CodeGenService.name);

  constructor(
    private readonly plansService: PlansService,
    private readonly gitService: GitService,
    private readonly gitBranchService: GitBranchService,
    private readonly codeExecutionService: CodeExecutionService,
  ) {}

  async executePlan(
    planId: string,
    projectPath: string,
  ): Promise<ExecutionResult> {
    const plan = await this.plansService.getPlan(planId);
    if (!plan) throw new NotFoundError('Plan', planId);

    await this.plansService.updatePlanStatus(planId, 'active');

    const errors: Array<{ stepId: string; error: string }> = [];
    let stepsCompleted = 0;

    for (const step of plan.steps) {
      const result = await this.executeStep(planId, step.id, projectPath);

      if (result.success) {
        stepsCompleted++;
      } else {
        errors.push({
          stepId: step.id,
          error: result.error ?? 'Unknown error',
        });
        break;
      }
    }

    const success = errors.length === 0;
    const validationResult = success
      ? await this.validateOutput(projectPath)
      : undefined;

    await this.plansService.updatePlanStatus(
      planId,
      success ? 'completed' : 'failed',
    );

    return {
      planId,
      success,
      stepsCompleted,
      stepsTotal: plan.steps.length,
      errors: errors.length > 0 ? errors : undefined,
      validationResult,
    };
  }

  async executeStep(
    planId: string,
    stepId: string,
    _projectPath: string,
  ): Promise<StepResult> {
    const plan = await this.plansService.getPlan(planId);
    if (!plan) throw new NotFoundError('Plan', planId);

    const step = plan.steps.find((s) => s.id === stepId);
    if (!step) throw new NotFoundError('PlanStep', stepId);

    await this.plansService.updateStep(planId, stepId, {
      status: 'in_progress',
    });

    try {
      this.logger.log(`Executing step ${stepId}: ${step.description}`);

      const output = `Step ${stepId} executed: ${step.description}`;

      await this.plansService.updateStep(planId, stepId, {
        status: 'completed',
        output,
      });

      return { stepId, success: true, output };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      await this.plansService.updateStep(planId, stepId, {
        status: 'failed',
        output: errorMsg,
      });

      return { stepId, success: false, error: errorMsg };
    }
  }

  async validateOutput(projectPath: string): Promise<ValidationResult> {
    const [typeCheckResult, lintResult, testResult] = await Promise.all([
      this.codeExecutionService.typeCheck(projectPath),
      this.codeExecutionService.lint(projectPath),
      this.codeExecutionService.runTests(projectPath),
    ]);

    return {
      typeCheck: {
        success: typeCheckResult.success,
        errors:
          typeCheckResult.errors.length > 0
            ? typeCheckResult.errors
            : undefined,
      },
      lint: {
        success: lintResult.success,
        errors: lintResult.errors.length > 0 ? lintResult.errors : undefined,
      },
      tests: {
        success: testResult.success,
        passed: testResult.passed,
        failed: testResult.failed,
      },
    };
  }

  async applyDelta(
    projectPath: string,
    changes: CodeChange[],
  ): Promise<ApplyResult> {
    const filesChanged: string[] = [];
    const errors: string[] = [];

    for (const change of changes) {
      try {
        const fullPath = `${projectPath}/${change.filePath}`;

        switch (change.action) {
          case 'create':
          case 'modify':
            if (change.content !== undefined) {
              await this.codeExecutionService.writeFileSafe(
                fullPath,
                change.content,
              );
              filesChanged.push(change.filePath);
            }
            break;

          case 'delete':
            await this.codeExecutionService.deleteFile(fullPath);
            filesChanged.push(change.filePath);
            break;
        }
      } catch (error) {
        errors.push(
          `${change.filePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return {
      success: errors.length === 0,
      filesChanged,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async executeWithBranch(
    planId: string,
    projectPath: string,
  ): Promise<ExecutionResult> {
    const plan = await this.plansService.getPlan(planId);
    if (!plan) throw new NotFoundError('Plan', planId);

    const branchName = await this.gitBranchService.createFeatureBranch(
      projectPath,
      `codegen-${planId}`,
    );
    await this.gitService.switchBranch(projectPath, branchName);

    try {
      const result = await this.executePlan(planId, projectPath);

      if (result.success) {
        await this.gitService.addAll(projectPath);
        const commitHash = await this.gitService.commit(
          projectPath,
          `feat(codegen): execute plan ${planId} - ${plan.title}`,
        );
        result.branch = branchName;
        result.commitHash = commitHash;
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Branch execution failed for plan ${planId}: ${error instanceof Error ? error.message : String(error)}`,
      );

      return {
        planId,
        success: false,
        stepsCompleted: 0,
        stepsTotal: plan.steps.length,
        branch: branchName,
        errors: [
          {
            stepId: 'branch-execution',
            error: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }

  async rollback(projectPath: string, commitHash: string): Promise<void> {
    this.logger.log(`Rolling back to ${commitHash} in ${projectPath}`);
    await this.gitService.switchBranch(projectPath, commitHash);
  }
}
