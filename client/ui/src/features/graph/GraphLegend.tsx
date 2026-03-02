import { memo, useCallback } from 'react';
import type { EdgeTypeConfig } from './types.js';
import './GraphLegend.scss';

export interface GraphLegendProps {
  edgeTypes: EdgeTypeConfig[];
  hiddenTypes?: Set<string>;
  onToggle?: (type: string) => void;
}

export const GraphLegend = memo(function GraphLegend({
  edgeTypes,
  hiddenTypes,
  onToggle,
}: GraphLegendProps) {
  return (
    <div className="GraphLegend" role="group" aria-label="Edge type legend">
      {edgeTypes.map((et) => (
        <LegendItem
          key={et.type}
          config={et}
          isHidden={hiddenTypes?.has(et.type) ?? false}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
});

interface LegendItemProps {
  config: EdgeTypeConfig;
  isHidden: boolean;
  onToggle?: (type: string) => void;
}

const LegendItem = memo(function LegendItem({
  config,
  isHidden,
  onToggle,
}: LegendItemProps) {
  const handleClick = useCallback(() => {
    onToggle?.(config.type);
  }, [onToggle, config.type]);

  return (
    <button
      className={`GraphLegend__item ${isHidden ? 'GraphLegend__item--hidden' : ''}`}
      onClick={handleClick}
      type="button"
      aria-pressed={!isHidden}
      title={`Toggle ${config.label}`}
    >
      <span
        className="GraphLegend__color"
        style={{
          backgroundColor: config.color,
          borderStyle: config.dashed ? 'dashed' : 'solid',
        }}
      />
      <span className="GraphLegend__label">{config.label}</span>
    </button>
  );
});
