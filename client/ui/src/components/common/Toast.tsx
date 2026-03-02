import { useEffect, useCallback, useState } from 'react';
import './Toast.scss';

export interface ToastProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onDismiss?: () => void;
  className?: string;
}

const ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '!',
  info: 'i',
};

export function Toast({
  type = 'info',
  message,
  duration = 5000,
  onDismiss,
  className = '',
}: ToastProps) {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss?.(), 200);
  }, [onDismiss]);

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(dismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, dismiss]);

  const classes = [
    'Toast',
    `Toast--${type}`,
    exiting && 'Toast--exiting',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role="status" aria-live="polite">
      <span className="Toast__icon" aria-hidden="true">
        {ICONS[type]}
      </span>
      <span className="Toast__message">{message}</span>
      {onDismiss && (
        <button
          className="Toast__close"
          onClick={dismiss}
          aria-label="Dismiss notification"
          type="button"
        >
          ×
        </button>
      )}
    </div>
  );
}
