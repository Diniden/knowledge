import {
  Controller,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { type CodeGenService } from './code-gen.service.js';
import type { CodeChange } from './code-gen.service.js';

@ApiTags('code-gen')
@Controller('code-gen')
export class CodeGenController {
  constructor(private readonly codeGenService: CodeGenService) {}

  @Post('execute/:planId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute a plan' })
  @ApiResponse({ status: 200, description: 'Execution result' })
  async executePlan(
    @Param('planId') planId: string,
    @Body() body: { projectPath: string },
  ) {
    return this.codeGenService.executeWithBranch(planId, body.projectPath);
  }

  @Post('execute/:planId/step/:stepId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute a single plan step' })
  @ApiResponse({ status: 200, description: 'Step execution result' })
  async executeStep(
    @Param('planId') planId: string,
    @Param('stepId') stepId: string,
    @Body() body: { projectPath: string },
  ) {
    return this.codeGenService.executeStep(planId, stepId, body.projectPath);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate generated code' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validate(@Body() body: { projectPath: string }) {
    return this.codeGenService.validateOutput(body.projectPath);
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply code changes' })
  @ApiResponse({ status: 200, description: 'Apply result' })
  async applyChanges(
    @Body() body: { projectPath: string; changes: CodeChange[] },
  ) {
    return this.codeGenService.applyDelta(body.projectPath, body.changes);
  }

  @Post('rollback')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Rollback to a commit' })
  @ApiResponse({ status: 204, description: 'Rollback completed' })
  async rollback(@Body() body: { projectPath: string; commitHash: string }) {
    await this.codeGenService.rollback(body.projectPath, body.commitHash);
  }
}
