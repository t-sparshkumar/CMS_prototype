import type { FieldMeta } from '../../lib/api';

interface FieldInterfaceOptionsEditorProps {
  iface: string;
  choices: string;
  slugSource: string;
  collectionFields: FieldMeta[];
  onChoicesChange: (value: string) => void;
  onSlugSourceChange: (value: string) => void;
}

const CHOICE_INTERFACES = [
  'select-dropdown',
  'radio-buttons',
  'checkboxes',
  'select-multiple-dropdown',
  'checkboxes-tree',
  'icon',
];

export default function FieldInterfaceOptionsEditor({
  iface,
  choices,
  slugSource,
  collectionFields,
  onChoicesChange,
  onSlugSourceChange,
}: FieldInterfaceOptionsEditorProps) {
  const showChoices = CHOICE_INTERFACES.includes(iface);
  const showSlugSource = iface === 'slug';

  if (!showChoices && !showSlugSource) {
    return (
      <p className="text-sm text-slate-500">
        No additional options for this interface. Configure schema, layout, and validation in other tabs.
      </p>
    );
  }

  const stringFields = collectionFields.filter(
    (f) => !f.is_system && f.type !== 'alias' && ['string', 'text'].includes(f.type),
  );

  return (
    <div className="space-y-4">
      {showChoices && (
        <div>
          <label className="label">Choices (one per line)</label>
          <textarea
            value={choices}
            onChange={(e) => onChoicesChange(e.target.value)}
            rows={5}
            placeholder="draft&#10;published&#10;archived"
            className="textarea font-mono text-sm"
          />
          {iface === 'checkboxes-tree' && (
            <p className="text-xs text-slate-400 mt-1">Store selected values as a JSON array.</p>
          )}
        </div>
      )}

      {showSlugSource && (
        <div>
          <label className="label">Source field</label>
          <select value={slugSource} onChange={(e) => onSlugSourceChange(e.target.value)} className="select">
            <option value="">Manual entry only</option>
            {stringFields.map((f) => (
              <option key={f.id} value={f.field}>
                {f.field}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">Auto-generate slug from another field when creating items.</p>
        </div>
      )}
    </div>
  );
}
