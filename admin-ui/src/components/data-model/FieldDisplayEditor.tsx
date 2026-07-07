import { DISPLAY_CATALOG, getDisplaysForInterface } from '../../lib/displayCatalog';

interface FieldDisplayEditorProps {
  iface: string;
  fieldType: string;
  display: string;
  displayOptionsJson: string;
  onDisplayChange: (value: string) => void;
  onDisplayOptionsChange: (value: string) => void;
}

export default function FieldDisplayEditor({
  iface,
  fieldType,
  display,
  displayOptionsJson,
  onDisplayChange,
  onDisplayOptionsChange,
}: FieldDisplayEditorProps) {
  const suggestions = getDisplaysForInterface(iface, fieldType);

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Display</label>
        <select value={display} onChange={(e) => onDisplayChange(e.target.value)} className="select">
          <option value="">Default</option>
          {suggestions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
          {!suggestions.some((item) => item.id === display) && display && (
            <option value={display}>{display}</option>
          )}
        </select>
        {display && (
          <p className="text-xs text-slate-400 mt-1">
            {DISPLAY_CATALOG.find((d) => d.id === display)?.description ?? 'Custom display handler'}
          </p>
        )}
      </div>
      <div>
        <label className="label">Display options (JSON)</label>
        <textarea
          value={displayOptionsJson}
          onChange={(e) => onDisplayOptionsChange(e.target.value)}
          rows={6}
          className="textarea font-mono text-xs"
          placeholder='{"format":"short"}'
        />
      </div>
    </div>
  );
}
