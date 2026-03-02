import { useState } from 'react';
import './Avatar.scss';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({
  src,
  alt = '',
  name,
  size = 'md',
  className = '',
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;
  const initials = name ? getInitials(name) : '?';

  const classes = ['Avatar', `Avatar--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} aria-label={name || alt}>
      {showImage ? (
        <img
          className="Avatar__image"
          src={src}
          alt={alt || name || ''}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="Avatar__initials" aria-hidden="true">
          {initials}
        </span>
      )}
    </span>
  );
}
