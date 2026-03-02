import './LoadingSkeleton.scss';

export interface LoadingSkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
}

export function LoadingSkeleton({
  width,
  height,
  variant = 'text',
  className = '',
}: LoadingSkeletonProps) {
  const classes = ['LoadingSkeleton', `LoadingSkeleton--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height)
    style.height = typeof height === 'number' ? `${height}px` : height;

  return <span className={classes} style={style} aria-hidden="true" />;
}
