import { useState } from 'react';
import './ChatHistory.scss';

export interface ChatConversation {
  id: string;
  title: string;
  lastMessage: string;
  date: string;
  messageCount: number;
}

export interface ChatHistoryProps {
  conversations: ChatConversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ChatHistory({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: ChatHistoryProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (pendingDelete === id) {
      onDelete(id);
      setPendingDelete(null);
    } else {
      setPendingDelete(id);
    }
  };

  return (
    <div className="ChatHistory">
      <div className="ChatHistory__header">
        <span>History</span>
        <button
          className="ChatHistory__new"
          type="button"
          onClick={onNew}
          aria-label="New conversation"
        >
          + New
        </button>
      </div>

      <div
        className="ChatHistory__list"
        role="listbox"
        aria-label="Conversation history"
      >
        {conversations.map((conv) => {
          const itemClasses = [
            'ChatHistory__item',
            activeId === conv.id && 'ChatHistory__item--active',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={conv.id}
              className={itemClasses}
              role="option"
              aria-selected={activeId === conv.id}
              tabIndex={0}
              onClick={() => onSelect(conv.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(conv.id);
                }
              }}
            >
              <div className="ChatHistory__title">{conv.title}</div>
              <div className="ChatHistory__preview">{conv.lastMessage}</div>
              <div className="ChatHistory__meta">
                <span>{conv.date}</span>
                <span>{conv.messageCount} messages</span>
                <button
                  className="ChatHistory__delete"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(conv.id);
                  }}
                  aria-label={
                    pendingDelete === conv.id
                      ? 'Confirm delete'
                      : `Delete conversation: ${conv.title}`
                  }
                >
                  {pendingDelete === conv.id ? 'Confirm?' : '×'}
                </button>
              </div>
            </div>
          );
        })}

        {conversations.length === 0 && (
          <div className="ChatHistory__empty">No conversations yet</div>
        )}
      </div>
    </div>
  );
}
