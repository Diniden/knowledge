import { Module } from '@nestjs/common';
import { SpecsController } from './specs.controller';
import { SpecsService } from './specs.service';
import { SpecsFileService } from './specs-file.service';
import { VersionService } from './version.service';
import { VersionController } from './version.controller';
import { GitModule } from '../git/git.module';

@Module({
  imports: [GitModule],
  controllers: [SpecsController, VersionController],
  providers: [SpecsService, SpecsFileService, VersionService],
  exports: [SpecsService, SpecsFileService, VersionService],
})
export class SpecsModule {}
