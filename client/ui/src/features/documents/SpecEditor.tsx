import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import { common, createLowlight } from 'lowlight';
import { EditorToolbar } from './EditorToolbar';
import { Button } from '../../components/common/Button';
import './SpecEditor.scss';

const lowlight = createLowlight(common);

const AUTO_SAVE_DEBOUNCE_MS = 2000;

export interface SpecEditorProps {
  documentId: string;
  specId: string;
  initialContent: string;
  onSave: (content: string) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

export function SpecEditor({
  initialContent,
  onSave,
  readOnly = false,
}: SpecEditorProps) {
  const [showSource, setShowSource] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your spec…',
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSave(ed.getHTML());
      }, AUTO_SAVE_DEBOUNCE_MS);
    },
  });

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
    };
  }, []);

  const handleManualSave = useCallback(() => {
    if (!editor) return;
    clearTimeout(debounceRef.current);
    onSave(editor.getHTML());
  }, [editor, onSave]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  const wordCount = useMemo(() => {
    if (!editor) return 0;
    const text = editor.state.doc.textContent;
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="SpecEditor">
      {!readOnly && <EditorToolbar editor={editor} />}

      {showSource ? (
        <div className="SpecEditor__source">{editor.getHTML()}</div>
      ) : (
        <div className="SpecEditor__content">
          <EditorContent editor={editor} />
        </div>
      )}

      <div className="SpecEditor__footer">
        <span className="SpecEditor__wordcount">{wordCount} words</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSource((prev) => !prev)}
        >
          {showSource ? 'Rich Text' : 'View Source'}
        </Button>
      </div>
    </div>
  );
}
