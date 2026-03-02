import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import './Dropdown.scss';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect: (id: string) => void;
  placement?: 'bottom-start' | 'bottom-end';
  className?: string;
}

export function Dropdown({
  trigger,
  items,
  onSelect,
  placement = 'bottom-start',
  className = '',
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        close();
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside as unknown as EventListener,
    );
    return () =>
      document.removeEventListener(
        'mousedown',
        handleClickOutside as unknown as EventListener,
      );
  }, [open, close]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        !open &&
        (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')
      ) {
        e.preventDefault();
        setOpen(true);
        setActiveIndex(0);
        return;
      }

      if (!open) return;

      const enabledItems = items.filter((item) => !item.disabled);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % enabledItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex(
            (prev) => (prev - 1 + enabledItems.length) % enabledItems.length,
          );
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (activeIndex >= 0 && enabledItems[activeIndex]) {
            onSelect(enabledItems[activeIndex].id);
            close();
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
      }
    },
    [open, items, activeIndex, onSelect, close],
  );

  const handleSelect = (item: DropdownItem) => {
    if (item.disabled) return;
    onSelect(item.id);
    close();
  };

  const classes = ['Dropdown', className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="group" aria-label="Dropdown menu">
      <div
        ref={triggerRef}
        className="Dropdown__trigger"
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </div>
      {open && (
        <div
          ref={menuRef}
          className={`Dropdown__menu Dropdown__menu--${placement}`}
          role="menu"
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              className={[
                'Dropdown__item',
                item.disabled && 'Dropdown__item--disabled',
                item.danger && 'Dropdown__item--danger',
                index === activeIndex && 'Dropdown__item--active',
              ]
                .filter(Boolean)
                .join(' ')}
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              onClick={() => handleSelect(item)}
              type="button"
            >
              {item.icon && (
                <span className="Dropdown__itemIcon">{item.icon}</span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
