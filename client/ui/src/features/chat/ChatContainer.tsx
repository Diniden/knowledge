import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, type ChatMessageProps } from './ChatMessage.js';
import { ChatInput } from './ChatInput.js';
import { ChatHistory, type ChatHistoryProps } from './ChatHistory.js';
import { AgentStatusBar, type AgentStatusBarProps } from './AgentStatusBar.js';
import { ChatQuickActions, type ChatQuickAction } from './ChatQuickActions.js';
import './ChatContainer.scss';

export interface ChatContainerProps {
  sessionId?: string;
  messages: ChatMessageProps[];
  conversations: ChatHistoryProps['conversations'];
  agentStatus: AgentStatusBarProps;
  onSendMessage: (message: string) => void;
  onCancel: () => void;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onInteraction: (messageId: string, type: string, data?: unknown) => void;
}

const DEFAULT_QUICK_ACTIONS: ChatQuickAction[] = [
  {
    id: 'suggest-edges',
    label: 'Suggest Edges',
    icon: '🔗',
    description: 'Find potential connections between specs',
  },
  {
    id: 'summarize',
    label: 'Summarize Spec',
    icon: '📝',
    description: 'Summarize the current spec',
  },
  {
    id: 'find-related',
    label: 'Find Related',
    icon: '🔍',
    description: 'Find related specs in the graph',
  },
  {
    id: 'create-spec',
    label: 'Create Spec',
    icon: '➕',
    description: 'Create a new spec from description',
  },
  {
    id: 'explain-graph',
    label: 'Explain Graph',
    icon: '🗺️',
    description: 'Explain the graph structure',
  },
];

export function ChatContainer({
  sessionId,
  messages,
  conversations,
  agentStatus,
  onSendMessage,
  onCancel,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onInteraction,
}: ChatContainerProps) {
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages.length, isAtBottom, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 40;
    setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const textarea = document.querySelector<HTMLTextAreaElement>(
          '.ChatInput__textarea',
        );
        textarea?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleQuickAction = useCallback(
    (actionId: string) => {
      const actionMap: Record<string, string> = {
        'suggest-edges': '/graph suggest edges for the current spec',
        summarize: '/spec summarize the current spec',
        'find-related': '/graph find related specs',
        'create-spec': '/spec create a new spec',
        'explain-graph': '/graph explain the current graph structure',
      };
      const msg = actionMap[actionId];
      if (msg) {
        onSendMessage(msg);
      }
    },
    [onSendMessage],
  );

  const isWorking =
    agentStatus.status === 'thinking' ||
    agentStatus.status === 'writing' ||
    agentStatus.status === 'tool_use';

  const conversationTitle =
    conversations.find((c) => c.id === sessionId)?.title ?? 'New Conversation';

  if (!sessionId) {
    return (
      <div className="ChatContainer">
        <div className="ChatContainer__empty">
          <p>Start a conversation with the AI assistant.</p>
          <button
            className="ChatContainer__emptyAction"
            type="button"
            onClick={onNewConversation}
          >
            New Conversation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ChatContainer">
      <div className="ChatContainer__header">
        <span className="ChatContainer__title">{conversationTitle}</span>
        <button
          className="ChatContainer__historyToggle"
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          aria-label={showHistory ? 'Hide history' : 'Show history'}
          aria-expanded={showHistory}
        >
          {showHistory ? '▾' : '▸'} History
        </button>
      </div>

      {showHistory && (
        <ChatHistory
          conversations={conversations}
          activeId={sessionId}
          onSelect={(id) => {
            onSelectConversation(id);
            setShowHistory(false);
          }}
          onNew={() => {
            onNewConversation();
            setShowHistory(false);
          }}
          onDelete={onDeleteConversation}
        />
      )}

      <div
        className="ChatContainer__messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && (
          <div className="ChatContainer__noMessages">
            Send a message to get started.
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            {...msg}
            onInteraction={(type, data) => onInteraction(msg.id, type, data)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {!isAtBottom && messages.length > 0 && (
        <button
          className="ChatContainer__scrollDown"
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to latest messages"
        >
          ↓
        </button>
      )}

      <div className="ChatContainer__status">
        <AgentStatusBar {...agentStatus} />
      </div>

      <ChatQuickActions
        actions={DEFAULT_QUICK_ACTIONS}
        onAction={handleQuickAction}
      />

      <div className="ChatContainer__input">
        <ChatInput
          onSend={onSendMessage}
          onCancel={onCancel}
          isAgentWorking={isWorking}
          placeholder="Ask the agent anything… (⌘K)"
        />
      </div>
    </div>
  );
}
