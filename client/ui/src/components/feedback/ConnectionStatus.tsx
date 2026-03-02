import './ConnectionStatus.scss';

export interface ConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'reconnecting';
  className?: string;
}

const STATUS_LABELS: Record<string, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  reconnecting: 'Reconnecting…',
};

export function ConnectionStatus({
  status,
  className = '',
}: ConnectionStatusProps) {
  const classes = ['ConnectionStatus', `ConnectionStatus--${status}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} role="status" aria-live="polite">
      <span className="ConnectionStatus__dot" aria-hidden="true" />
      <span className="ConnectionStatus__label">{STATUS_LABELS[status]}</span>
    </span>
  );
}
