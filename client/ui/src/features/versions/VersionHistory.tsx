import { useState, useCallback, useMemo } from 'react';
import './VersionHistory.scss';

export interface VersionEntry {
  commitHash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
}

export interface VersionHistoryProps {
  specId: string;
  versions: VersionEntry[];
  onSelectVersion: (commitHash: string) => void;
  onCompare: (commitA: string, commitB: string) => void;
  onRevert: (commitHash: string) => void;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

export function VersionHistory({
  versions,
  onSelectVersion,
  onCompare,
  onRevert,
}: VersionHistoryProps) {
  const [selectedHash, setSelectedHash] = useState<string | undefined>();
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set());

  const handleSelect = useCallback(
    (hash: string) => {
      setSelectedHash(hash);
      onSelectVersion(hash);
    },
    [onSelectVersion],
  );

  const handleCheckToggle = useCallback((hash: string) => {
    setCompareSet((prev) => {
      const next = new Set(prev);
      if (next.has(hash)) {
        next.delete(hash);
      } else if (next.size < 2) {
        next.add(hash);
      }
      return next;
    });
  }, []);

  const canCompare = compareSet.size === 2;

  const handleCompare = useCallback(() => {
    if (!canCompare) return;
    const [a, b] = [...compareSet];
    if (a && b) onCompare(a, b);
  }, [canCompare, compareSet, onCompare]);

  const sortedVersions = useMemo(
    () =>
      [...versions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [versions],
  );

  return (
    <div className="VersionHistory">
      <div className="VersionHistory__header">
        <h3 className="VersionHistory__title">Version History</h3>
        {canCompare && (
          <button
            className="VersionHistory__compareBtn"
            onClick={handleCompare}
          >
            Compare selected
          </button>
        )}
      </div>

      <div className="VersionHistory__timeline">
        {sortedVersions.map((v, idx) => {
          const isSelected = selectedHash === v.commitHash;
          const isChecked = compareSet.has(v.commitHash);
          const isLast = idx === sortedVersions.length - 1;

          return (
            <div
              key={v.commitHash}
              className={[
                'VersionHistory__entry',
                isSelected && 'VersionHistory__entry--selected',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="VersionHistory__dot" />
              {!isLast && <div className="VersionHistory__line" />}

              <div className="VersionHistory__content">
                <button
                  className="VersionHistory__hashBtn"
                  onClick={() => handleSelect(v.commitHash)}
                >
                  <span className="VersionHistory__hash">{v.shortHash}</span>
                </button>

                <span className="VersionHistory__message">{v.message}</span>

                <div className="VersionHistory__meta">
                  <span>{v.author}</span>
                  <span>{relativeTime(v.date)}</span>
                </div>

                <div className="VersionHistory__actions">
                  <label className="VersionHistory__checkbox">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCheckToggle(v.commitHash)}
                      disabled={!isChecked && compareSet.size >= 2}
                    />
                    Compare
                  </label>
                  <button
                    className="VersionHistory__revertBtn"
                    onClick={() => onRevert(v.commitHash)}
                  >
                    Revert to this version
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
