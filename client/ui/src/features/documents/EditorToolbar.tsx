import type { Editor } from '@tiptap/react';
import { Tooltip } from '../../components/common/Tooltip';
import './EditorToolbar.scss';

export interface EditorToolbarProps {
  editor: Editor;
}

interface ToolbarAction {
  id: string;
  label: string;
  shortcut?: string;
  icon: string;
  isActive: () => boolean;
  action: () => void;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const textFormatting: ToolbarAction[] = [
    {
      id: 'bold',
      label: 'Bold',
      shortcut: 'Ctrl+B',
      icon: 'B',
      isActive: () => editor.isActive('bold'),
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      id: 'italic',
      label: 'Italic',
      shortcut: 'Ctrl+I',
      icon: 'I',
      isActive: () => editor.isActive('italic'),
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      id: 'code',
      label: 'Inline Code',
      shortcut: 'Ctrl+E',
      icon: '<>',
      isActive: () => editor.isActive('code'),
      action: () => editor.chain().focus().toggleCode().run(),
    },
    {
      id: 'strike',
      label: 'Strikethrough',
      icon: 'S',
      isActive: () => editor.isActive('strike'),
      action: () => editor.chain().focus().toggleStrike().run(),
    },
  ];

  const headings: ToolbarAction[] = [
    {
      id: 'h1',
      label: 'Heading 1',
      shortcut: 'Ctrl+1',
      icon: 'H1',
      isActive: () => editor.isActive('heading', { level: 1 }),
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'h2',
      label: 'Heading 2',
      shortcut: 'Ctrl+2',
      icon: 'H2',
      isActive: () => editor.isActive('heading', { level: 2 }),
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'h3',
      label: 'Heading 3',
      shortcut: 'Ctrl+3',
      icon: 'H3',
      isActive: () => editor.isActive('heading', { level: 3 }),
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
  ];

  const lists: ToolbarAction[] = [
    {
      id: 'bulletList',
      label: 'Bullet List',
      icon: '•',
      isActive: () => editor.isActive('bulletList'),
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'orderedList',
      label: 'Ordered List',
      icon: '1.',
      isActive: () => editor.isActive('orderedList'),
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'taskList',
      label: 'Task List',
      icon: '☑',
      isActive: () => editor.isActive('taskList'),
      action: () => editor.chain().focus().toggleTaskList().run(),
    },
  ];

  const blocks: ToolbarAction[] = [
    {
      id: 'codeBlock',
      label: 'Code Block',
      icon: '{ }',
      isActive: () => editor.isActive('codeBlock'),
      action: () => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'blockquote',
      label: 'Blockquote',
      icon: '"',
      isActive: () => editor.isActive('blockquote'),
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'link',
      label: 'Insert Link',
      shortcut: 'Ctrl+K',
      icon: '🔗',
      isActive: () => editor.isActive('link'),
      action: () => {
        const previousUrl = editor.getAttributes('link').href as
          | string
          | undefined;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;

        if (url === '') {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
          return;
        }

        editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: url })
          .run();
      },
    },
  ];

  const renderGroup = (actions: ToolbarAction[]) => (
    <div className="EditorToolbar__group">
      {actions.map((item) => {
        const classes = [
          'EditorToolbar__button',
          item.isActive() && 'EditorToolbar__button--active',
        ]
          .filter(Boolean)
          .join(' ');

        const tooltip = item.shortcut
          ? `${item.label} (${item.shortcut})`
          : item.label;

        return (
          <Tooltip key={item.id} content={tooltip} placement="bottom">
            <button
              type="button"
              className={classes}
              onClick={item.action}
              aria-label={item.label}
              aria-pressed={item.isActive()}
            >
              {item.icon}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );

  return (
    <div
      className="EditorToolbar"
      role="toolbar"
      aria-label="Editor formatting"
    >
      {renderGroup(textFormatting)}
      <span className="EditorToolbar__divider" />
      {renderGroup(headings)}
      <span className="EditorToolbar__divider" />
      {renderGroup(lists)}
      <span className="EditorToolbar__divider" />
      {renderGroup(blocks)}
    </div>
  );
}
