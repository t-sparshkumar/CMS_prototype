import { useState } from 'react';
import { asStringArray } from '../../lib/fieldUtils';
import { FieldLabel } from './fieldShared';
import type { FieldMeta } from '../../lib/api';

interface TagsFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export default function TagsField({ field, value, onChange, disabled }: TagsFieldProps) {
  const tags = asStringArray(value);
  const [input, setInput] = useState('');

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInput('');
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      <FieldLabel field={field} />
      <div className="field-tags">
        {tags.map((tag) => (
          <span key={tag} className="field-tag-chip">
            {tag}
            {!disabled && (
              <button type="button" onClick={() => removeTag(tag)} className="field-tag-remove" aria-label={`Remove ${tag}`}>
                ×
              </button>
            )}
          </span>
        ))}
        {!disabled && (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag(input);
              }
              if (e.key === 'Backspace' && !input && tags.length > 0) {
                const lastTag = tags[tags.length - 1];
                if (lastTag) removeTag(lastTag);
              }
            }}
            onBlur={() => addTag(input)}
            placeholder={tags.length === 0 ? 'Add tags...' : ''}
            className="field-tags-input"
          />
        )}
      </div>
    </div>
  );
}
