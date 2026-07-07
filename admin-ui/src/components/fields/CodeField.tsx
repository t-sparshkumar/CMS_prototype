import { FieldLabel, inputClassName } from './fieldShared';
import type { FieldMeta } from '../../lib/api';

interface CodeFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

export default function CodeField({ field, value, onChange, disabled }: CodeFieldProps) {
  const language =
    typeof field.options?.language === 'string' ? field.options.language : 'javascript';

  return (
    <div>
      <FieldLabel field={field} />
      <div className="field-code-editor">
        <div className="field-code-lang">{language}</div>
        <textarea
          value={String(value ?? '')}
          disabled={disabled}
          rows={10}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClassName} field-code-textarea font-mono text-xs`}
          placeholder="// Write code here..."
        />
      </div>
    </div>
  );
}
