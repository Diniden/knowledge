import { Module } from '@nestjs/common';
import { GitService } from './git.service';
import { GitDiffService } from './git-diff.service';
import { GitBranchService } from './git-branch.service';

@Module({
  providers: [GitService, GitDiffService, GitBranchService],
  exports: [GitService, GitDiffService, GitBranchService],
})
export class GitModule {}
