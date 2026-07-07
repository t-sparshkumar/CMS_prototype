import { useRef, useState } from 'react';
import { FieldLabel, FieldTabBar } from './fieldShared';
import type { FieldMeta } from '../../lib/api';

interface WysiwygFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

type Tab = 'edit' | 'preview';

export default function WysiwygField({ field, value, onChange, disabled }: WysiwygFieldProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>('edit');
  const html = String(value ?? '');

  function exec(command: string, arg?: string) {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }

  return (
    <div>
      <FieldLabel field={field} />
      <FieldTabBar
        tabs={[
          { id: 'edit', label: 'Edit' },
          { id: 'preview', label: 'Preview' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />
      {tab === 'edit' ? (
        <div className="field-wysiwyg">
          <div className="field-wysiwyg-toolbar">
            <button type="button" disabled={disabled} onClick={() => exec('bold')} className="field-wysiwyg-btn">
              <strong>B</strong>
            </button>
            <button type="button" disabled={disabled} onClick={() => exec('italic')} className="field-wysiwyg-btn">
              <em>I</em>
            </button>
            <button type="button" disabled={disabled} onClick={() => exec('underline')} className="field-wysiwyg-btn">
              <u>U</u>
            </button>
            <button type="button" disabled={disabled} onClick={() => exec('formatBlock', 'h2')} className="field-wysiwyg-btn">
              H2
            </button>
            <button type="button" disabled={disabled} onClick={() => exec('insertUnorderedList')} className="field-wysiwyg-btn">
              • List
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                const url = window.prompt('Link URL');
                if (url) exec('createLink', url);
              }}
              className="field-wysiwyg-btn"
            >
              Link
            </button>
          </div>
          <div
            ref={editorRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            className="field-wysiwyg-editor"
            dangerouslySetInnerHTML={{ __html: html }}
            onInput={() => {
              if (editorRef.current) onChange(editorRef.current.innerHTML);
            }}
          />
        </div>
      ) : (
        <div
          className="field-wysiwyg-preview p-4 border border-surface-border rounded-b-xl bg-white min-h-[8rem] text-sm text-slate-700"
          dangerouslySetInnerHTML={{ __html: html || '<p class="text-slate-400">Empty content</p>' }}
        />
      )}
    </div>
  );
}
