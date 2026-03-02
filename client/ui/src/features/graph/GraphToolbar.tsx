import { memo, useState, useCallback } from 'react';
import './GraphToolbar.scss';

export interface GraphToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToView: () => void;
  onSearch: (query: string) => void;
  zoom: number;
}

export const GraphToolbar = memo(function GraphToolbar({
  onZoomIn,
  onZoomOut,
  onFitToView,
  onSearch,
  zoom,
}: GraphToolbarProps) {
  const [searchValue, setSearchValue] = useState('');

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);
      onSearch(value);
    },
    [onSearch],
  );

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="GraphToolbar" role="toolbar" aria-label="Graph controls">
      <div className="GraphToolbar__search">
        <svg
          className="GraphToolbar__searchIcon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="GraphToolbar__searchInput"
          placeholder="Search nodes..."
          value={searchValue}
          onChange={handleSearchChange}
          aria-label="Search nodes"
        />
      </div>
      <div className="GraphToolbar__zoom">
        <button
          className="GraphToolbar__zoomButton"
          onClick={onZoomOut}
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
        >
          &minus;
        </button>
        <span className="GraphToolbar__zoomLevel">{zoomPercent}%</span>
        <button
          className="GraphToolbar__zoomButton"
          onClick={onZoomIn}
          type="button"
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
        <button
          className="GraphToolbar__zoomButton GraphToolbar__zoomButton--fit"
          onClick={onFitToView}
          type="button"
          aria-label="Fit to view"
          title="Fit to view"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
          </svg>
        </button>
      </div>
    </div>
  );
});
