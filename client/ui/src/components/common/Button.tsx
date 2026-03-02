import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import './Button.scss';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      children,
      ...rest
    },
    ref,
  ) => {
    const classes = [
      'Button',
      `Button--${variant}`,
      `Button--${size}`,
      fullWidth && 'Button--fullWidth',
      loading && 'Button--loading',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...rest}
      >
        {loading && <span className="Button__spinner" aria-hidden="true" />}
        {!loading && leftIcon && (
          <span className="Button__icon Button__icon--left">{leftIcon}</span>
        )}
        {children && <span className="Button__label">{children}</span>}
        {!loading && rightIcon && (
          <span className="Button__icon Button__icon--right">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
