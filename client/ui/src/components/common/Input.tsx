import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import './Input.scss';

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size'
> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      id,
      ...rest
    },
    ref,
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;
    const describedBy =
      [errorId, helperId].filter(Boolean).join(' ') || undefined;

    const wrapperClasses = [
      'Input',
      error && 'Input--error',
      disabled && 'Input--disabled',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        {label && (
          <label className="Input__label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className="Input__wrapper">
          {leftIcon && (
            <span className="Input__icon Input__icon--left">{leftIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className="Input__field"
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            {...rest}
          />
          {rightIcon && (
            <span className="Input__icon Input__icon--right">{rightIcon}</span>
          )}
        </div>
        {error && (
          <span id={errorId} className="Input__error" role="alert">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span id={helperId} className="Input__helper">
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
