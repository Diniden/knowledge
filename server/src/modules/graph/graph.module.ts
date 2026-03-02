import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller.js';
import { GraphService } from './graph.service.js';
import { GraphTraversalService } from './graph-traversal.service.js';
import { GraphIndexService } from './graph-index.service.js';
import { SpecsModule } from '../specs/specs.module.js';

@Module({
  imports: [SpecsModule],
  controllers: [GraphController],
  providers: [GraphService, GraphTraversalService, GraphIndexService],
  exports: [GraphService, GraphTraversalService, GraphIndexService],
})
export class GraphModule {}
