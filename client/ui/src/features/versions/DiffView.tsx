import { useMemo } from 'react';
import './DiffView.scss';

export interface DiffViewProps {
  oldContent: string;
  newContent: string;
  oldLabel?: string;
  newLabel?: string;
}

interface DiffLineData {
  type: 'addition' | 'deletion' | 'context';
  oldNum?: number;
  newNum?: number;
  content: string;
  inlineChanges?: Array<{ type: 'add' | 'delete'; text: string }>;
}

/**
 * Simple line-based diff with character-level inline highlighting.
 * Produces a unified view — no +/- gutters, just light tints.
 */
function computeDiff(oldText: string, newText: string): DiffLineData[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLineData[] = [];

  const _max = Math.max(oldLines.length, newLines.length);
  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldIdx < oldLines.length ? oldLines[oldIdx] : undefined;
    const newLine = newIdx < newLines.length ? newLines[newIdx] : undefined;

    if (oldLine === newLine) {
      result.push({
        type: 'context',
        oldNum: oldIdx + 1,
        newNum: newIdx + 1,
        content: oldLine ?? '',
      });
      oldIdx++;
      newIdx++;
    } else if (
      oldLine !== undefined &&
      newLine !== undefined &&
      areSimilar(oldLine, newLine)
    ) {
      const inlineChanges = computeInlineChanges(oldLine, newLine);
      result.push({
        type: 'deletion',
        oldNum: oldIdx + 1,
        content: oldLine,
        inlineChanges: inlineChanges.filter((c) => c.type === 'delete'),
      });
      result.push({
        type: 'addition',
        newNum: newIdx + 1,
        content: newLine,
        inlineChanges: inlineChanges.filter((c) => c.type === 'add'),
      });
      oldIdx++;
      newIdx++;
    } else if (
      oldLine !== undefined &&
      (newLine === undefined || !newLines.slice(newIdx).includes(oldLine))
    ) {
      result.push({
        type: 'deletion',
        oldNum: oldIdx + 1,
        content: oldLine,
      });
      oldIdx++;
    } else {
      result.push({
        type: 'addition',
        newNum: newIdx + 1,
        content: newLine ?? '',
      });
      newIdx++;
    }
  }

  return result;
}

function areSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return true;
  const editDist = simpleDistance(shorter, longer);
  return editDist / longer.length < 0.5;
}

function simpleDistance(a: string, b: string): number {
  let dist = 0;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
}

function computeInlineChanges(
  oldLine: string,
  newLine: string,
): Array<{ type: 'add' | 'delete'; text: string }> {
  const changes: Array<{ type: 'add' | 'delete'; text: string }> = [];
  const oldWords = oldLine.split(/(\s+)/);
  const newWords = newLine.split(/(\s+)/);

  const max = Math.max(oldWords.length, newWords.length);
  for (let i = 0; i < max; i++) {
    const ow = i < oldWords.length ? oldWords[i] : undefined;
    const nw = i < newWords.length ? newWords[i] : undefined;
    if (ow !== nw) {
      if (ow) changes.push({ type: 'delete', text: ow });
      if (nw) changes.push({ type: 'add', text: nw });
    }
  }
  return changes;
}

function renderContent(line: DiffLineData) {
  if (!line.inlineChanges || line.inlineChanges.length === 0) {
    return <span>{line.content}</span>;
  }

  const words = line.content.split(/(\s+)/);
  const changeTexts = new Set(line.inlineChanges.map((c) => c.text));
  const hlClass =
    line.type === 'addition'
      ? 'DiffView__highlight--add'
      : 'DiffView__highlight--delete';

  return (
    <span>
      {words.map((word, i) =>
        changeTexts.has(word) ? (
          <span key={i} className={hlClass}>
            {word}
          </span>
        ) : (
          <span key={i}>{word}</span>
        ),
      )}
    </span>
  );
}

export function DiffView({
  oldContent,
  newContent,
  oldLabel,
  newLabel,
}: DiffViewProps) {
  const lines = useMemo(
    () => computeDiff(oldContent, newContent),
    [oldContent, newContent],
  );

  return (
    <div className="DiffView">
      <div className="DiffView__header">
        <div className="DiffView__labels">
          {oldLabel && (
            <span className="DiffView__label DiffView__label--old">
              {oldLabel}
            </span>
          )}
          {newLabel && (
            <span className="DiffView__label DiffView__label--new">
              {newLabel}
            </span>
          )}
        </div>
      </div>

      <div className="DiffView__content">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={[
              'DiffView__line',
              line.type === 'addition' && 'DiffView__line--addition',
              line.type === 'deletion' && 'DiffView__line--deletion',
              line.type === 'context' && 'DiffView__line--context',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="DiffView__lineNumber DiffView__lineNumber--old">
              {line.oldNum ?? ''}
            </span>
            <span className="DiffView__lineNumber DiffView__lineNumber--new">
              {line.newNum ?? ''}
            </span>
            <span className="DiffView__text">{renderContent(line)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
