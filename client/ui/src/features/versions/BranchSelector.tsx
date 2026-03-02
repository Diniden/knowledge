import { useState, useCallback, useRef, useEffect } from 'react';
import './BranchSelector.scss';

export interface BranchItem {
  name: string;
  current: boolean;
}

export interface BranchSelectorProps {
  currentBranch: string;
  branches: BranchItem[];
  onSwitch: (name: string) => void;
  onCreate: (name: string) => void;
  onMerge: (source: string) => void;
  onDelete: (name: string) => void;
}

export function BranchSelector({
  currentBranch,
  branches,
  onSwitch,
  onCreate,
  onMerge,
  onDelete,
}: BranchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filteredBranches = search
    ? branches.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase()),
      )
    : branches;

  const handleCreate = useCallback(() => {
    const name = newBranchName.trim();
    if (!name) return;
    onCreate(name);
    setNewBranchName('');
  }, [newBranchName, onCreate]);

  const handleDelete = useCallback(
    (name: string) => {
      if (confirmDelete === name) {
        onDelete(name);
        setConfirmDelete(null);
      } else {
        setConfirmDelete(name);
      }
    },
    [confirmDelete, onDelete],
  );

  return (
    <div className="BranchSelector" ref={dropdownRef}>
      <button className="BranchSelector__trigger" onClick={toggle}>
        <svg
          className="BranchSelector__icon"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="currentColor"
        >
          <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6.5a2.5 2.5 0 01-2.5 2.5H7.5v2.128a2.251 2.251 0 11-1.5 0V4.872a2.25 2.25 0 111.5 0V8.5h2.5a1 1 0 001-1v-1.128A2.251 2.251 0 019.5 3.25zM4.25 3.5a.75.75 0 100 1.5.75.75 0 000-1.5zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
        </svg>
        {currentBranch}
      </button>

      {open && (
        <div className="BranchSelector__dropdown">
          <input
            className="BranchSelector__search"
            type="text"
            placeholder="Search branches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="BranchSelector__list">
            {filteredBranches.map((b) => (
              <div
                key={b.name}
                className={[
                  'BranchSelector__item',
                  b.current && 'BranchSelector__item--current',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <button
                  className="BranchSelector__itemName"
                  onClick={() => {
                    onSwitch(b.name);
                    setOpen(false);
                  }}
                >
                  {b.name}
                  {b.current && (
                    <span className="BranchSelector__badge">current</span>
                  )}
                </button>

                {!b.current && (
                  <div className="BranchSelector__actions">
                    <button
                      className="BranchSelector__actionBtn"
                      onClick={() => onMerge(b.name)}
                      title="Merge into current"
                    >
                      Merge
                    </button>
                    <button
                      className="BranchSelector__actionBtn BranchSelector__actionBtn--danger"
                      onClick={() => handleDelete(b.name)}
                      title="Delete branch"
                    >
                      {confirmDelete === b.name ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="BranchSelector__create">
            <input
              className="BranchSelector__createInput"
              type="text"
              placeholder="New branch name..."
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
              }}
            />
            <button
              className="BranchSelector__createBtn"
              onClick={handleCreate}
              disabled={!newBranchName.trim()}
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
