import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import './SlashCommandMenu.scss';

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon?: ReactNode;
}

export interface SlashCommandMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  commands: SlashCommand[];
  onSelect: (commandId: string) => void;
  onClose: () => void;
}

export function SlashCommandMenu({
  isOpen,
  position,
  commands,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase()),
  );

  /* eslint-disable react-hooks/set-state-in-effect -- reset form state when menu opens */
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- reset selection when query changes */
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(
          (prev) => (prev - 1 + filtered.length) % filtered.length,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const active = filtered[activeIndex];
        if (active) {
          onSelect(active.id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, activeIndex, onSelect, onClose],
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="SlashCommandMenu"
      style={{ left: position.x, top: position.y }}
      role="listbox"
      aria-label="Slash commands"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="SlashCommandMenu__search">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter commands…"
          aria-label="Filter commands"
        />
      </div>

      <ul className="SlashCommandMenu__list">
        {filtered.map((cmd, index) => {
          const classes = [
            'SlashCommandMenu__item',
            index === activeIndex && 'SlashCommandMenu__item--active',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <li
              key={cmd.id}
              className={classes}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => onSelect(cmd.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(cmd.id);
                }
              }}
              onMouseEnter={() => setActiveIndex(index)}
              tabIndex={-1}
            >
              {cmd.icon && (
                <span className="SlashCommandMenu__icon">{cmd.icon}</span>
              )}
              <div>
                <div className="SlashCommandMenu__label">{cmd.label}</div>
                <div className="SlashCommandMenu__description">
                  {cmd.description}
                </div>
              </div>
            </li>
          );
        })}

        {filtered.length === 0 && (
          <li className="SlashCommandMenu__item" style={{ cursor: 'default' }}>
            <span className="SlashCommandMenu__description">
              No commands found
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
