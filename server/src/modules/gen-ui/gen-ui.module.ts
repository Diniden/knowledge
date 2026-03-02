import { Module } from '@nestjs/common';
import { GenUiService } from './gen-ui.service.js';
import { GenUiController } from './gen-ui.controller.js';

@Module({
  controllers: [GenUiController],
  providers: [GenUiService],
  exports: [GenUiService],
})
export class GenUiModule {}
