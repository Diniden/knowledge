import { useState, useCallback } from 'react';
import { GenUiSandbox } from './GenUiSandbox.js';
import './GenUiViewer.scss';

export interface GenUiViewerProps {
  project: {
    id: string;
    name: string;
    description: string;
    bundleUrl: string;
  };
  onClose: () => void;
  onRefresh: () => void;
}

interface ConsoleEntry {
  id: number;
  type: 'message' | 'error';
  content: string;
  timestamp: string;
}

let entryCounter = 0;

export function GenUiViewer({ project, onClose, onRefresh }: GenUiViewerProps) {
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);

  const handleMessage = useCallback((message: unknown) => {
    const entry: ConsoleEntry = {
      id: ++entryCounter,
      type: 'message',
      content: typeof message === 'string' ? message : JSON.stringify(message),
      timestamp: new Date().toLocaleTimeString(),
    };
    setConsoleEntries((prev) => [...prev.slice(-99), entry]);
  }, []);

  const handleError = useCallback((error: Error) => {
    const entry: ConsoleEntry = {
      id: ++entryCounter,
      type: 'error',
      content: error.message,
      timestamp: new Date().toLocaleTimeString(),
    };
    setConsoleEntries((prev) => [...prev.slice(-99), entry]);
    setConsoleOpen(true);
  }, []);

  return (
    <div className="GenUiViewer">
      <div className="GenUiViewer__header">
        <div className="GenUiViewer__title">
          <h3>{project.name}</h3>
          <span className="GenUiViewer__description">
            {project.description}
          </span>
        </div>
        <div className="GenUiViewer__actions">
          <button
            className="GenUiViewer__actionBtn"
            onClick={() => setConsoleOpen((o) => !o)}
            title="Toggle console"
          >
            Console
            {consoleEntries.length > 0 ? ` (${consoleEntries.length})` : ''}
          </button>
          <button
            className="GenUiViewer__actionBtn"
            onClick={onRefresh}
            title="Refresh"
          >
            Refresh
          </button>
          <button
            className="GenUiViewer__actionBtn GenUiViewer__actionBtn--close"
            onClick={onClose}
            title="Close"
          >
            Close
          </button>
        </div>
      </div>

      <div className="GenUiViewer__sandbox">
        <GenUiSandbox
          projectId={project.id}
          bundleUrl={project.bundleUrl}
          onMessage={handleMessage}
          onError={handleError}
          height="100%"
        />
      </div>

      {consoleOpen && (
        <div className="GenUiViewer__console">
          <div className="GenUiViewer__consoleHeader">
            <span>Console</span>
            <button
              onClick={() => setConsoleEntries([])}
              className="GenUiViewer__consoleClear"
            >
              Clear
            </button>
          </div>
          <div className="GenUiViewer__consoleBody">
            {consoleEntries.length === 0 && (
              <div className="GenUiViewer__consoleEmpty">No messages yet</div>
            )}
            {consoleEntries.map((entry) => (
              <div
                key={entry.id}
                className={`GenUiViewer__consoleEntry GenUiViewer__consoleEntry--${entry.type}`}
              >
                <span className="GenUiViewer__consoleTime">
                  {entry.timestamp}
                </span>
                <span className="GenUiViewer__consoleContent">
                  {entry.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
