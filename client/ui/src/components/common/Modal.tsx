import {
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import './Modal.scss';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlayClick?: boolean;
  footer?: ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  footer,
  className = '',
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  const handleOverlayClick = useCallback(
    (e: MouseEvent) => {
      if (closeOnOverlayClick && e.target === e.currentTarget) onClose();
    },
    [closeOnOverlayClick, onClose],
  );

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    // Focus the modal content
    requestAnimationFrame(() => {
      const focusable = contentRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (focusable || contentRef.current)?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const classes = ['Modal', `Modal--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return createPortal(
    <div className={classes}>
      <div
        className="Modal__overlay"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        className="Modal__content"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        {title && (
          <div className="Modal__header">
            <h2 className="Modal__title">{title}</h2>
            <button
              className="Modal__close"
              onClick={onClose}
              aria-label="Close dialog"
              type="button"
            >
              ×
            </button>
          </div>
        )}
        <div className="Modal__body">{children}</div>
        {footer && <div className="Modal__footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
