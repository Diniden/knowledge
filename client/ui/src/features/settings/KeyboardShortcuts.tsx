import './KeyboardShortcuts.scss';

interface Shortcut {
  action: string;
  keys: string[];
}

const SHORTCUTS: Shortcut[] = [
  { action: 'Open Chat', keys: ['Cmd+K', 'Ctrl+K'] },
  { action: 'Save', keys: ['Cmd+S', 'Ctrl+S'] },
  { action: 'Search Specs', keys: ['Cmd+P', 'Ctrl+P'] },
  { action: 'Toggle Sidebar', keys: ['Cmd+B', 'Ctrl+B'] },
  { action: 'New Spec', keys: ['Cmd+N', 'Ctrl+N'] },
  { action: 'Graph View', keys: ['Cmd+G', 'Ctrl+G'] },
  { action: 'Version History', keys: ['Cmd+H', 'Ctrl+H'] },
];

export function KeyboardShortcuts() {
  return (
    <div className="KeyboardShortcuts">
      <p className="KeyboardShortcuts__description">
        Available keyboard shortcuts for quick navigation and actions.
      </p>
      <table className="KeyboardShortcuts__table">
        <thead>
          <tr className="KeyboardShortcuts__headerRow">
            <th className="KeyboardShortcuts__headerCell">Action</th>
            <th className="KeyboardShortcuts__headerCell">Shortcut</th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUTS.map((shortcut) => (
            <tr key={shortcut.action} className="KeyboardShortcuts__row">
              <td className="KeyboardShortcuts__action">{shortcut.action}</td>
              <td className="KeyboardShortcuts__keys">
                {shortcut.keys.map((key, i) => (
                  <span key={key}>
                    {i > 0 && (
                      <span className="KeyboardShortcuts__separator"> / </span>
                    )}
                    <kbd className="KeyboardShortcuts__key">{key}</kbd>
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
