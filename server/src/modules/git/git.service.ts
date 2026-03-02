import { Injectable } from '@nestjs/common';

/**
 * Git service stub.
 * Will wrap git operations (commit, branch, merge, diff, revert)
 * for the knowledge-graph/ directory in Phase 2.
 */
@Injectable()
export class GitService {
  async commit(_message: string, _files: string[]): Promise<string> {
    return 'placeholder-commit-hash';
  }

  async diff(_fromHash: string, _toHash: string): Promise<string> {
    return '';
  }

  async log(_path?: string): Promise<{ hash: string; message: string; timestamp: string }[]> {
    return [];
  }
}
