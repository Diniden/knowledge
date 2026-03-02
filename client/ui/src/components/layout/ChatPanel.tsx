import { observer } from 'mobx-react-lite';
import { ChatContainer } from '../../features/chat/ChatContainer.js';
import { useStore } from '../../stores/index.js';
import './ChatPanel.scss';

export interface ChatPanelProps {
  open?: boolean;
  onToggle?: () => void;
}

export const ChatPanel = observer(function ChatPanel({
  open = true,
  onToggle,
}: ChatPanelProps) {
  const { chat } = useStore();

  const classes = ['ChatPanel', !open && 'ChatPanel--collapsed']
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={classes} aria-label="Chat panel">
      {!open ? (
        <button
          className="ChatPanel__expandTab"
          onClick={onToggle}
          aria-label="Open chat panel"
          type="button"
        >
          💬
        </button>
      ) : (
        <>
          <div className="ChatPanel__header">
            <span className="ChatPanel__title">Chat</span>
            <button
              className="ChatPanel__minimize"
              onClick={onToggle}
              aria-label="Minimize chat panel"
              type="button"
            >
              ▸
            </button>
          </div>
          <div className="ChatPanel__body">
            <ChatContainer
              sessionId={chat.activeSessionId ?? undefined}
              messages={chat.chatMessages}
              conversations={chat.conversationList}
              agentStatus={chat.agentStatusProps}
              onSendMessage={(msg) => chat.sendMessage(msg)}
              onCancel={() => chat.cancelOperation()}
              onNewConversation={() => chat.newConversation()}
              onSelectConversation={(id) => chat.selectConversation(id)}
              onDeleteConversation={(id) => chat.deleteConversation(id)}
              onInteraction={(_msgId, _type, _data) => {
                // Will be wired to agent interaction handling
              }}
            />
          </div>
        </>
      )}
    </aside>
  );
});
