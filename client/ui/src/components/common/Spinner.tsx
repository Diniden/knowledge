import './Spinner.scss';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function Spinner({ size = 'md', color, className = '' }: SpinnerProps) {
  const classes = ['Spinner', `Spinner--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classes}
      style={
        color ? { borderTopColor: color, borderRightColor: color } : undefined
      }
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading…</span>
    </span>
  );
}
