import { useState, useCallback } from 'react';
import { AppLayout } from '../components/layout/AppLayout.js';
import {
  VersionHistory,
  DiffView,
  BranchSelector,
  SnapshotManager,
} from '../features/versions/index.js';
import type {
  VersionEntry,
  BranchItem,
  SnapshotItem,
} from '../features/versions/index.js';
import './VersionsPage.scss';

const MOCK_VERSIONS: VersionEntry[] = [
  {
    commitHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
    shortHash: 'a1b2c3d',
    message: 'kg(spec): update authentication requirements',
    author: 'Alice',
    date: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    commitHash: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
    shortHash: 'b2c3d4e',
    message: 'kg(spec): add OAuth2 flow details',
    author: 'Bob',
    date: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    commitHash: 'c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
    shortHash: 'c3d4e5f',
    message: 'kg(spec): create initial authentication spec',
    author: 'Alice',
    date: new Date(Date.now() - 172800000).toISOString(),
  },
];

const MOCK_BRANCHES: BranchItem[] = [
  { name: 'main', current: true },
  { name: 'kg/alice/auth-refactor', current: false },
  { name: 'kg/bob/security-review', current: false },
];

const MOCK_SNAPSHOTS: SnapshotItem[] = [
  {
    name: 'pre-refactor',
    commitHash: 'abc1234567890def',
    date: '2026-02-28',
  },
];

const MOCK_OLD_CONTENT = `# Authentication Spec

## Overview
This spec covers the basic authentication flow for the application.

## Requirements
- Users must provide email and password.
- Passwords must be at least 8 characters.
- Sessions expire after 24 hours.

## Notes
No additional notes.`;

const MOCK_NEW_CONTENT = `# Authentication Spec

## Overview
This spec covers the complete authentication and authorization flow.

## Requirements
- Users must provide email and password.
- Passwords must be at least 12 characters with mixed case.
- Sessions expire after 24 hours.
- OAuth2 support for Google and GitHub.

## Security
All tokens are stored as HTTP-only cookies.

## Notes
Updated per security review.`;

export function VersionsPage() {
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>();
  const [comparing, setComparing] = useState(false);
  const [currentBranch, setCurrentBranch] = useState('main');

  const handleSelectVersion = useCallback((hash: string) => {
    setSelectedVersion(hash);
    setComparing(false);
  }, []);

  const handleCompare = useCallback((_commitA: string, _commitB: string) => {
    setComparing(true);
  }, []);

  const handleRevert = useCallback((hash: string) => {
    // eslint-disable-next-line no-console
    console.log('Revert to:', hash);
  }, []);

  const handleBranchSwitch = useCallback((name: string) => {
    setCurrentBranch(name);
  }, []);

  const handleBranchCreate = useCallback((name: string) => {
    // eslint-disable-next-line no-console
    console.log('Create branch:', name);
  }, []);

  const handleBranchMerge = useCallback((source: string) => {
    // eslint-disable-next-line no-console
    console.log('Merge branch:', source);
  }, []);

  const handleBranchDelete = useCallback((name: string) => {
    // eslint-disable-next-line no-console
    console.log('Delete branch:', name);
  }, []);

  const handleSnapshotCreate = useCallback((name: string) => {
    // eslint-disable-next-line no-console
    console.log('Create snapshot:', name);
  }, []);

  const handleSnapshotRestore = useCallback((name: string) => {
    // eslint-disable-next-line no-console
    console.log('Restore snapshot:', name);
  }, []);

  return (
    <AppLayout>
      <div className="VersionsPage">
        <div className="VersionsPage__toolbar">
          <BranchSelector
            currentBranch={currentBranch}
            branches={MOCK_BRANCHES}
            onSwitch={handleBranchSwitch}
            onCreate={handleBranchCreate}
            onMerge={handleBranchMerge}
            onDelete={handleBranchDelete}
          />
        </div>

        <div className="VersionsPage__body">
          <aside className="VersionsPage__sidebar">
            <VersionHistory
              specId="sp_auth_001"
              versions={MOCK_VERSIONS}
              onSelectVersion={handleSelectVersion}
              onCompare={handleCompare}
              onRevert={handleRevert}
            />
            <SnapshotManager
              snapshots={MOCK_SNAPSHOTS}
              onCreate={handleSnapshotCreate}
              onRestore={handleSnapshotRestore}
            />
          </aside>

          <div className="VersionsPage__main">
            {comparing ? (
              <DiffView
                oldContent={MOCK_OLD_CONTENT}
                newContent={MOCK_NEW_CONTENT}
                oldLabel="v1 (c3d4e5f)"
                newLabel="v3 (a1b2c3d)"
              />
            ) : selectedVersion ? (
              <DiffView
                oldContent={MOCK_OLD_CONTENT}
                newContent={MOCK_NEW_CONTENT}
                oldLabel="Previous version"
                newLabel={`Version ${selectedVersion.slice(0, 7)}`}
              />
            ) : (
              <div className="VersionsPage__empty">
                <span className="VersionsPage__emptyTitle">
                  Select a version
                </span>
                <span className="VersionsPage__emptyDescription">
                  Choose a version from the timeline to view its changes, or
                  select two versions to compare.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
