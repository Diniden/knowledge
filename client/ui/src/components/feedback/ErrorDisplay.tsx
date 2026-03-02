import './ErrorDisplay.scss';

export interface ErrorAction {
  label: string;
  onClick: () => void;
}

export interface ErrorDisplayProps {
  title: string;
  message: string;
  details?: string;
  variant?: 'inline' | 'card' | 'fullPage';
  actions?: ErrorAction[];
  className?: string;
}

export function ErrorDisplay({
  title,
  message,
  details,
  variant = 'card',
  actions = [],
  className = '',
}: ErrorDisplayProps) {
  const classes = ['ErrorDisplay', `ErrorDisplay--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role="alert">
      <span className="ErrorDisplay__icon" aria-hidden="true">
        ⚠
      </span>
      <h3 className="ErrorDisplay__title">{title}</h3>
      <p className="ErrorDisplay__message">{message}</p>
      {details && (
        <details className="ErrorDisplay__details">
          <summary>Show details</summary>
          <pre>{details}</pre>
        </details>
      )}
      {actions.length > 0 && (
        <div className="ErrorDisplay__actions">
          {actions.map((action) => (
            <button
              key={action.label}
              className="ErrorDisplay__action"
              onClick={action.onClick}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
