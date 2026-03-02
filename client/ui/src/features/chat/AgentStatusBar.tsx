import { useState, useEffect, useRef } from 'react';
import './AgentStatusBar.scss';

export interface AgentStatusBarProps {
  status: 'idle' | 'thinking' | 'writing' | 'tool_use' | 'error';
  agentType?: string;
  currentTool?: string;
  duration?: number;
}

const STATUS_LABELS: Record<AgentStatusBarProps['status'], string> = {
  idle: 'Ready',
  thinking: 'Thinking…',
  writing: 'Writing…',
  tool_use: 'Using tool',
  error: 'Error',
};

export function AgentStatusBar({
  status,
  agentType,
  currentTool,
  duration,
}: AgentStatusBarProps) {
  const startRef = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status === 'idle' || status === 'error') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset elapsed when status becomes idle/error
      setElapsed(0);
      return;
    }
    if (duration !== undefined) {
      setElapsed(duration);
      return;
    }
    startRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [status, duration]);

  if (status === 'idle') return null;

  const classes = ['AgentStatusBar', `AgentStatusBar--${status}`].join(' ');

  const statusText = (() => {
    if (status === 'tool_use' && currentTool) {
      return `Using tool: ${currentTool}`;
    }
    let label = STATUS_LABELS[status];
    if (agentType) {
      label = `${agentType} · ${label}`;
    }
    return label;
  })();

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className={classes} role="status" aria-live="polite">
      <div className="AgentStatusBar__indicator" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <span className="AgentStatusBar__text">{statusText}</span>
      {elapsed > 0 && (
        <span className="AgentStatusBar__duration">
          {formatDuration(elapsed)}
        </span>
      )}
    </div>
  );
}
