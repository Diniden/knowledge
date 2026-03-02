import { useState, useCallback } from 'react';
import './SnapshotManager.scss';

export interface SnapshotItem {
  name: string;
  commitHash: string;
  date: string;
}

export interface SnapshotManagerProps {
  snapshots: SnapshotItem[];
  onCreate: (name: string) => void;
  onRestore: (name: string) => void;
}

export function SnapshotManager({
  snapshots,
  onCreate,
  onRestore,
}: SnapshotManagerProps) {
  const [newName, setNewName] = useState('');

  const handleCreate = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName('');
  }, [newName, onCreate]);

  return (
    <div className="SnapshotManager">
      <h4 className="SnapshotManager__title">Snapshots</h4>

      <div className="SnapshotManager__create">
        <input
          className="SnapshotManager__input"
          type="text"
          placeholder="Snapshot name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
        />
        <button
          className="SnapshotManager__btn"
          onClick={handleCreate}
          disabled={!newName.trim()}
        >
          Create
        </button>
      </div>

      <div className="SnapshotManager__list">
        {snapshots.length === 0 && (
          <p className="SnapshotManager__empty">No snapshots yet.</p>
        )}
        {snapshots.map((s) => (
          <div key={s.name} className="SnapshotManager__item">
            <div className="SnapshotManager__itemInfo">
              <span className="SnapshotManager__itemName">{s.name}</span>
              <span className="SnapshotManager__itemMeta">
                {s.commitHash.slice(0, 7)} &middot; {s.date}
              </span>
            </div>
            <button
              className="SnapshotManager__restoreBtn"
              onClick={() => onRestore(s.name)}
            >
              Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
