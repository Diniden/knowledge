import { Module } from '@nestjs/common';

import { SpecsController } from './specs.controller.js';
import { SpecsService } from './specs.service.js';

@Module({
  controllers: [SpecsController],
  providers: [SpecsService],
  exports: [SpecsService],
})
export class SpecsModule {}
