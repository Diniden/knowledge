import { Module } from '@nestjs/common';
import { PlansController } from './plans.controller.js';
import { PlansService } from './plans.service.js';
import { GraphModule } from '../graph/graph.module.js';
import { RagModule } from '../rag/rag.module.js';
import { GitModule } from '../git/git.module.js';

@Module({
  imports: [GraphModule, RagModule, GitModule],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
