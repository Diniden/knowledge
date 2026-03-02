import { useState, useRef, type ReactNode } from 'react';
import './Tooltip.scss';

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export function Tooltip({
  content,
  children,
  placement = 'top',
  delay = 300,
  className = '',
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  const classes = ['Tooltip', visible && 'Tooltip--visible', className]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={classes}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          className={`Tooltip__content Tooltip__content--${placement}`}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  );
}
