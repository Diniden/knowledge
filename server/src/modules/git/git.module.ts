import { Module } from '@nestjs/common';

import { GitService } from './git.service.js';

/**
 * Git integration module.
 * Handles commit, branch, merge, diff for knowledge-graph/ versioning.
 * Full implementation in Phase 2 (03-SERVER/05-GIT-INTEGRATION-PLAN.md).
 */
@Module({
  providers: [GitService],
  exports: [GitService],
})
export class GitModule {}
