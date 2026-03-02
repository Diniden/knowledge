import { markdownToHtml } from './markdown.js';
import './ChatMessage.scss';

export interface ChatMessageInteraction {
  type: 'accept' | 'reject' | 'edit' | 'link';
  label: string;
  specId?: string;
  data?: unknown;
}

export interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  isStreaming?: boolean;
  interactiveElements?: ChatMessageInteraction[];
  onInteraction?: (type: string, data?: unknown) => void;
  onRetry?: () => void;
}

export function ChatMessage({
  role,
  content,
  timestamp,
  status,
  isStreaming,
  interactiveElements,
  onInteraction,
  onRetry,
}: ChatMessageProps) {
  const classes = [
    'ChatMessage',
    `ChatMessage--${role}`,
    status === 'error' && 'ChatMessage--error',
    isStreaming && 'ChatMessage--streaming',
  ]
    .filter(Boolean)
    .join(' ');

  const formattedTime = timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const renderAvatar = () => {
    if (role === 'system') return null;
    const label = role === 'user' ? 'U' : 'A';
    return (
      <div className="ChatMessage__avatar" aria-hidden="true">
        {label}
      </div>
    );
  };

  const renderContent = () => {
    if (role === 'assistant' || role === 'system') {
      const html = markdownToHtml(content);
      return (
        <div
          className="ChatMessage__markdown"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    return <div className="ChatMessage__content">{content}</div>;
  };

  return (
    <div className={classes} role="article">
      {renderAvatar()}
      <div className="ChatMessage__body">
        {renderContent()}

        {isStreaming && (
          <div className="ChatMessage__typing" aria-label="Typing">
            <span />
            <span />
            <span />
          </div>
        )}

        {interactiveElements && interactiveElements.length > 0 && (
          <div className="ChatMessage__actions">
            {interactiveElements.map((el) => {
              const btnClass = [
                'ChatMessage__action',
                el.type === 'accept' && 'ChatMessage__action--accept',
                el.type === 'reject' && 'ChatMessage__action--reject',
              ]
                .filter(Boolean)
                .join(' ');

              if (el.type === 'link') {
                return (
                  <button
                    key={el.label}
                    className="ChatMessage__link"
                    type="button"
                    onClick={() =>
                      onInteraction?.('link', { specId: el.specId })
                    }
                  >
                    {el.label}
                  </button>
                );
              }

              return (
                <button
                  key={el.label}
                  className={btnClass}
                  type="button"
                  onClick={() => onInteraction?.(el.type, el.data)}
                >
                  {el.label}
                </button>
              );
            })}
          </div>
        )}

        {status === 'error' && (
          <div className="ChatMessage__error">
            <span>Failed to send</span>
            {onRetry && (
              <button
                className="ChatMessage__action"
                type="button"
                onClick={onRetry}
              >
                Retry
              </button>
            )}
          </div>
        )}

        <time
          className="ChatMessage__timestamp"
          dateTime={timestamp.toISOString()}
        >
          {formattedTime}
          {status === 'sending' && ' · Sending…'}
        </time>
      </div>
    </div>
  );
}
