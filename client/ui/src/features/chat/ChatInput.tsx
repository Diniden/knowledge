import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from 'react';
import './ChatInput.scss';

export interface ChatInputProps {
  onSend: (message: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  isAgentWorking?: boolean;
  placeholder?: string;
}

const MAX_ROWS = 6;
const LINE_HEIGHT_PX = 20;
const MIN_HEIGHT_PX = LINE_HEIGHT_PX;
const MAX_HEIGHT_PX = LINE_HEIGHT_PX * MAX_ROWS;

export function ChatInput({
  onSend,
  onCancel,
  disabled = false,
  isAgentWorking = false,
  placeholder = 'Ask the agent anything…',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const classes = [
    'ChatInput',
    disabled && 'ChatInput--disabled',
    isAgentWorking && 'ChatInput--working',
  ]
    .filter(Boolean)
    .join(' ');

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_HEIGHT_PX}px`;
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const showSlashHint = value.startsWith('/');

  return (
    <div className={classes}>
      {showSlashHint && (
        <div className="ChatInput__hint">
          Try: /help, /graph, /spec, /analyze, /clear
        </div>
      )}
      <div className="ChatInput__row">
        <textarea
          ref={textareaRef}
          className="ChatInput__textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          aria-label="Chat message input"
          style={{ minHeight: MIN_HEIGHT_PX, maxHeight: MAX_HEIGHT_PX }}
        />
        <div className="ChatInput__actions">
          {isAgentWorking && onCancel ? (
            <button
              className="ChatInput__cancel"
              type="button"
              onClick={onCancel}
              aria-label="Cancel agent operation"
            >
              Stop
            </button>
          ) : (
            <button
              className="ChatInput__send"
              type="button"
              onClick={handleSend}
              disabled={disabled || !value.trim()}
              aria-label="Send message"
            >
              ↑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
