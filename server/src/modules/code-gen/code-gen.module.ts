import { Module } from '@nestjs/common';
import { CodeGenController } from './code-gen.controller.js';
import { CodeGenService } from './code-gen.service.js';
import { CodeExecutionService } from './code-execution.service.js';
import { PlansModule } from '../plans/plans.module.js';
import { GitModule } from '../git/git.module.js';

@Module({
  imports: [PlansModule, GitModule],
  controllers: [CodeGenController],
  providers: [CodeGenService, CodeExecutionService],
  exports: [CodeGenService],
})
export class CodeGenModule {}
