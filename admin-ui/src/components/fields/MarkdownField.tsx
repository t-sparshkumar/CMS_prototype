import { useState } from 'react';
import { markdownToHtml } from '../../lib/fieldUtils';
import { FieldLabel, FieldTabBar } from './fieldShared';
import type { FieldMeta } from '../../lib/api';

interface MarkdownFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

type Tab = 'write' | 'preview';

export default function MarkdownField({ field, value, onChange, disabled }: MarkdownFieldProps) {
  const [tab, setTab] = useState<Tab>('write');
  const text = String(value ?? '');

  return (
    <div>
      <FieldLabel field={field} />
      <FieldTabBar
        tabs={[
          { id: 'write', label: 'Write' },
          { id: 'preview', label: 'Preview' },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />
      {tab === 'write' ? (
        <textarea
          value={text}
          disabled={disabled}
          rows={8}
          onChange={(e) => onChange(e.target.value)}
          className="input font-mono text-xs rounded-t-none"
          placeholder="# Heading&#10;&#10;Write **markdown** here..."
        />
      ) : (
        <div
          className="field-markdown-preview p-4 border border-surface-border rounded-b-xl bg-white min-h-[8rem] text-sm text-slate-700"
          dangerouslySetInnerHTML={{
            __html: text ? `<p class="mb-2">${markdownToHtml(text)}</p>` : '<p class="text-slate-400">Nothing to preview</p>',
          }}
        />
      )}
    </div>
  );
}
