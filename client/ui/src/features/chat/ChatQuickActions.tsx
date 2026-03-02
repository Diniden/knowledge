import './ChatQuickActions.scss';

export interface ChatQuickAction {
  id: string;
  label: string;
  icon?: string;
  description: string;
}

export interface ChatQuickActionsProps {
  actions: ChatQuickAction[];
  onAction: (actionId: string) => void;
}

export function ChatQuickActions({ actions, onAction }: ChatQuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="ChatQuickActions">
      <div
        className="ChatQuickActions__list"
        role="toolbar"
        aria-label="Quick actions"
      >
        {actions.map((action) => (
          <button
            key={action.id}
            className="ChatQuickActions__action"
            type="button"
            onClick={() => onAction(action.id)}
            title={action.description}
            aria-label={`${action.label}: ${action.description}`}
          >
            {action.icon && (
              <span className="ChatQuickActions__icon" aria-hidden="true">
                {action.icon}
              </span>
            )}
            <span className="ChatQuickActions__label">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
