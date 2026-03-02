import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { PlanStepStatus } from '@kg/shared';
import { type PlansService } from './plans.service.js';
import type { ExecutionStatus, DeltaResult } from './plans.service.js';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a new plan from a root spec' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  async createPlan(
    @Body()
    body: {
      rootSpecId: string;
      projectPath: string;
      title: string;
      description?: string;
      depth?: number;
      includeRelated?: boolean;
    },
  ) {
    return this.plansService.generatePlan(body);
  }

  @Get()
  @ApiOperation({ summary: 'List plans for a project' })
  @ApiResponse({ status: 200, description: 'List of plans' })
  async listPlans(
    @Query('projectId') projectId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.plansService.listPlans(projectId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a plan by ID' })
  @ApiResponse({ status: 200, description: 'The plan' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async getPlan(@Param('id') id: string) {
    const plan = await this.plansService.getPlan(id);
    if (!plan) throw new NotFoundException(`Plan ${id} not found`);
    return plan;
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update plan status' })
  @ApiResponse({ status: 204, description: 'Status updated' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    await this.plansService.updatePlanStatus(id, body.status);
  }

  @Post(':id/steps')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a step to a plan' })
  @ApiResponse({ status: 201, description: 'Step added' })
  async addStep(
    @Param('id') id: string,
    @Body()
    step: {
      description: string;
      status: string;
      dependencies: string[];
      output?: string;
    },
  ) {
    return this.plansService.addStep(id, {
      description: step.description,
      status: (step.status ?? 'pending') as PlanStepStatus,
      dependencies: step.dependencies ?? [],
      output: step.output,
    });
  }

  @Patch(':id/steps/:stepId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Update a plan step' })
  @ApiResponse({ status: 204, description: 'Step updated' })
  async updateStep(
    @Param('id') id: string,
    @Param('stepId') stepId: string,
    @Body()
    updates: {
      description?: string;
      status?: string;
      output?: string;
      dependencies?: string[];
    },
  ) {
    await this.plansService.updateStep(id, stepId, {
      ...updates,
      status: updates.status as PlanStepStatus | undefined,
    });
  }

  @Get(':id/execution')
  @ApiOperation({ summary: 'Get plan execution status' })
  @ApiResponse({ status: 200, description: 'Execution status' })
  async getExecutionStatus(@Param('id') id: string): Promise<ExecutionStatus> {
    return this.plansService.getExecutionStatus(id);
  }

  @Post('delta')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detect changes since a reference point' })
  @ApiResponse({ status: 200, description: 'Delta detection result' })
  async detectDelta(
    @Body()
    body: {
      projectPath: string;
      since?: string;
      sinceTimestamp?: string;
    },
  ): Promise<DeltaResult> {
    return this.plansService.detectDelta(body.projectPath, {
      since: body.since,
      sinceTimestamp: body.sinceTimestamp,
    });
  }
}
