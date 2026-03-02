import { Injectable, Logger } from '@nestjs/common';
import type {
  Plan,
  PlanStep,
  PlanStepStatus,
  PlanStatus,
  Edge,
  GraphNode,
} from '@kg/shared';
import {
  generatePlanId,
  generateId,
  NotFoundError,
  PermissionLevel,
} from '@kg/shared';
import { type GraphService } from '../graph/graph.service.js';
import { type GraphTraversalService } from '../graph/graph-traversal.service.js';
import { type GraphIndexService } from '../graph/graph-index.service.js';
import { type RagService } from '../rag/rag.service.js';
import { type GitService } from '../git/git.service.js';

interface PlanContext {
  specs: GraphNode[];
  edges: Edge[];
  relatedSpecs: GraphNode[];
}

export interface DeltaResult {
  added: string[];
  modified: string[];
  deleted: string[];
  affectedSpecs: string[];
}

export interface ExecutionStatus {
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  pendingSteps: number;
  progress: number;
}

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);
  private plans = new Map<string, Plan>();

  constructor(
    private readonly graphService: GraphService,
    private readonly graphTraversalService: GraphTraversalService,
    private readonly graphIndexService: GraphIndexService,
    private readonly ragService: RagService,
    private readonly gitService: GitService,
  ) {}

  async generatePlan(options: {
    rootSpecId: string;
    projectPath: string;
    title: string;
    description?: string;
    depth?: number;
    includeRelated?: boolean;
  }): Promise<Plan> {
    const depth = options.depth ?? 5;

    const context = await this.buildPlanContext(
      options.rootSpecId,
      options.projectPath,
      depth,
    );

    const steps: PlanStep[] = context.specs.map((node, index) => ({
      id: `step_${generateId(12)}`,
      description: `Implement: ${node.spec.title}`,
      status: 'pending' as PlanStepStatus,
      dependencies: index > 0 ? [context.specs[index - 1]!.id] : [],
    }));

    if (options.includeRelated && context.relatedSpecs.length > 0) {
      for (const related of context.relatedSpecs) {
        steps.push({
          id: `step_${generateId(12)}`,
          description: `Review related: ${related.spec.title}`,
          status: 'pending' as PlanStepStatus,
          dependencies: [],
        });
      }
    }

    const now = new Date().toISOString();
    const plan: Plan = {
      id: generatePlanId(),
      title: options.title,
      description: options.description ?? '',
      steps,
      sourceSpecIds: context.specs.map((n) => n.spec.id),
      status: 'draft',
      createdAt: now,
    };

    this.plans.set(plan.id, plan);
    this.logger.log(
      `Generated plan ${plan.id} with ${steps.length} steps from root spec ${options.rootSpecId}`,
    );
    return plan;
  }

  async getPlan(planId: string): Promise<Plan | null> {
    return this.plans.get(planId) ?? null;
  }

  async listPlans(
    _projectId: string,
    options?: { status?: string; limit?: number; offset?: number },
  ): Promise<Plan[]> {
    let plans = Array.from(this.plans.values());

    if (options?.status) {
      plans = plans.filter((p) => p.status === options.status);
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return plans.slice(offset, offset + limit);
  }

  async updatePlanStatus(planId: string, status: string): Promise<void> {
    const plan = this.plans.get(planId);
    if (!plan) throw new NotFoundError('Plan', planId);
    plan.status = status as PlanStatus;
    this.plans.set(planId, plan);
  }

  async addStep(planId: string, step: Omit<PlanStep, 'id'>): Promise<PlanStep> {
    const plan = this.plans.get(planId);
    if (!plan) throw new NotFoundError('Plan', planId);

    const newStep: PlanStep = {
      ...step,
      id: `step_${generateId(12)}`,
    };

    plan.steps.push(newStep);
    this.plans.set(planId, plan);
    return newStep;
  }

  async updateStep(
    planId: string,
    stepId: string,
    updates: Partial<PlanStep>,
  ): Promise<void> {
    const plan = this.plans.get(planId);
    if (!plan) throw new NotFoundError('Plan', planId);

    const step = plan.steps.find((s) => s.id === stepId);
    if (!step) throw new NotFoundError('PlanStep', stepId);

    if (updates.description !== undefined)
      step.description = updates.description;
    if (updates.status !== undefined) step.status = updates.status;
    if (updates.output !== undefined) step.output = updates.output;
    if (updates.dependencies !== undefined)
      step.dependencies = updates.dependencies;

    this.plans.set(planId, plan);
  }

  async getExecutionStatus(planId: string): Promise<ExecutionStatus> {
    const plan = this.plans.get(planId);
    if (!plan) throw new NotFoundError('Plan', planId);

    const totalSteps = plan.steps.length;
    const completedSteps = plan.steps.filter(
      (s) => s.status === 'completed',
    ).length;
    const failedSteps = plan.steps.filter((s) => s.status === 'failed').length;
    const pendingSteps = plan.steps.filter(
      (s) => s.status === 'pending' || s.status === 'in_progress',
    ).length;
    const progress = totalSteps > 0 ? completedSteps / totalSteps : 0;

    return { totalSteps, completedSteps, failedSteps, pendingSteps, progress };
  }

  async detectDelta(
    projectPath: string,
    options: { since?: string; sinceTimestamp?: string },
  ): Promise<DeltaResult> {
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];
    const affectedSpecs: string[] = [];

    if (options.since) {
      try {
        const commits = await this.gitService.log(projectPath, {
          since: options.since,
          limit: 100,
        });

        for (const commit of commits) {
          if (commit.hash === options.since) continue;

          const detail = await this.gitService.show(projectPath, commit.hash);
          for (const file of detail.files) {
            const specIdMatch = /specs\/.*\/(spec_[a-zA-Z0-9_-]+)\.json/.exec(
              file.path,
            );
            if (!specIdMatch?.[1]) continue;

            const specId = specIdMatch[1];
            if (file.status === 'added') {
              added.push(specId);
            } else if (file.status === 'deleted') {
              deleted.push(specId);
            } else {
              modified.push(specId);
            }
            affectedSpecs.push(specId);
          }
        }
      } catch (error) {
        this.logger.warn(
          `Delta detection from commit failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else if (options.sinceTimestamp) {
      try {
        const commits = await this.gitService.log(projectPath, {
          since: options.sinceTimestamp,
          limit: 100,
        });

        for (const commit of commits) {
          const detail = await this.gitService.show(projectPath, commit.hash);
          for (const file of detail.files) {
            const specIdMatch = /specs\/.*\/(spec_[a-zA-Z0-9_-]+)\.json/.exec(
              file.path,
            );
            if (!specIdMatch?.[1]) continue;

            const specId = specIdMatch[1];
            if (file.status === 'added') {
              added.push(specId);
            } else if (file.status === 'deleted') {
              deleted.push(specId);
            } else {
              modified.push(specId);
            }
            if (!affectedSpecs.includes(specId)) {
              affectedSpecs.push(specId);
            }
          }
        }
      } catch (error) {
        this.logger.warn(
          `Delta detection from timestamp failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return { added, modified, deleted, affectedSpecs };
  }

  // -- Legacy API (kept for backward compatibility) --

  async create(
    title: string,
    description: string,
    sourceSpecIds: string[],
    steps: Array<Omit<PlanStep, 'id' | 'status'>>,
  ): Promise<Plan> {
    const now = new Date().toISOString();
    const plan: Plan = {
      id: generatePlanId(),
      title,
      description,
      steps: steps.map((s) => ({
        ...s,
        id: `step_${generateId(12)}`,
        status: 'pending' as PlanStepStatus,
      })),
      sourceSpecIds,
      status: 'draft',
      createdAt: now,
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  async findById(id: string): Promise<Plan> {
    const plan = this.plans.get(id);
    if (!plan) throw new NotFoundError('Plan', id);
    return plan;
  }

  async findAll(): Promise<Plan[]> {
    return Array.from(this.plans.values());
  }

  async updateStepStatus(
    planId: string,
    stepId: string,
    status: PlanStepStatus,
  ): Promise<Plan> {
    const plan = await this.findById(planId);
    const step = plan.steps.find((s) => s.id === stepId);
    if (!step) throw new NotFoundError('PlanStep', stepId);

    step.status = status;
    this.plans.set(plan.id, plan);
    return plan;
  }

  // -- Private helpers --

  private async buildPlanContext(
    rootSpecId: string,
    projectPath: string,
    depth: number,
  ): Promise<PlanContext> {
    const adjacency = await this.graphIndexService.getAdjacency(projectPath);
    const nodes = await this.graphTraversalService.bfs(
      rootSpecId,
      adjacency,
      depth,
    );

    const allEdges = await this.graphService.getAllEdges();
    const specIds = new Set(nodes.map((n) => n.id));
    const relevantEdges = allEdges.filter(
      (e) => specIds.has(e.sourceSpecId) && specIds.has(e.targetSpecId),
    );

    const relatedSpecs: GraphNode[] = [];
    try {
      const ragResults = await this.ragService.search(
        nodes.map((n) => n.spec.title).join(' '),
        { limit: 5, threshold: 0.5, excludeSpecIds: Array.from(specIds) },
      );

      for (const result of ragResults) {
        if (!specIds.has(result.specId)) {
          relatedSpecs.push({
            id: result.specId,
            spec: {
              id: result.specId,
              title: result.chunkText.slice(0, 100),
              content: result.chunkText,
              tags: [],
              documentId: result.documentId,
              authorId: '',
              createdAt: '',
              updatedAt: '',
              version: 0,
              commitHash: '',
              permissionLevel: PermissionLevel.FULL_ACCESS,
              mediaAssociations: [],
            },
            edges: [],
            depth: -1,
          });
        }
      }
    } catch {
      this.logger.warn(
        'RAG search for related specs failed; continuing without related context',
      );
    }

    return {
      specs: nodes,
      edges: relevantEdges,
      relatedSpecs,
    };
  }
}
