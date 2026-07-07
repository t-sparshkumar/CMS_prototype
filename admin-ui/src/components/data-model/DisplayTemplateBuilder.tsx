import type { FieldMeta } from '../../lib/api';

interface DisplayTemplateBuilderProps {
  fields: FieldMeta[];
  value: string;
  onChange: (value: string) => void;
}

export default function DisplayTemplateBuilder({ fields, value, onChange }: DisplayTemplateBuilderProps) {
  const usable = fields.filter((f) => !f.is_system && f.type !== 'alias');

  function appendField(fieldName: string) {
    onChange(`${value}{{${fieldName}}}`);
  }

  return (
    <div className="space-y-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="{{title}}"
        className="input font-mono"
      />
      <div className="flex flex-wrap gap-1.5">
        {usable.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => appendField(f.field)}
            className="badge-gray hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-600/20 transition-colors cursor-pointer"
          >
            {f.field}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-400">Use {'{{field}}'} tokens for item labels in relations and lists.</p>
    </div>
  );
}
