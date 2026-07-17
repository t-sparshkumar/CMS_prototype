interface ColorPickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith('#')) return trimmed;
  if (HEX_PATTERN.test(trimmed)) return trimmed.toLowerCase();
  return trimmed;
}

export default function ColorPickerField({
  value,
  onChange,
  placeholder = 'Choose a color…',
}: ColorPickerFieldProps) {
  const displayValue = value || '';
  const swatchColor = HEX_PATTERN.test(displayValue) ? displayValue : '#6366f1';

  return (
    <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-3 py-2">
      <label className="relative shrink-0 cursor-pointer">
        <span
          className="block h-9 w-9 rounded-lg border border-slate-200 shadow-sm"
          style={{ backgroundColor: swatchColor }}
        />
        <input
          type="color"
          value={HEX_PATTERN.test(displayValue) ? displayValue : '#6366f1'}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Pick color"
        />
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="currentColor" aria-hidden="true">
          <path d="M17.66 7.93 12 2.27 6.34 7.93c-3.12 3.12-3.12 8.19 0 11.31C7.9 20.8 9.95 21.46 12 21.46s4.1-.66 5.66-2.22c3.12-3.12 3.12-8.19 0-11.31zM12 19.96c-1.38 0-2.68-.54-3.66-1.52S6.82 15.38 6.82 14s.54-2.68 1.52-3.66S10.62 8.82 12 8.82s2.68.54 3.66 1.52 1.52 2.28 1.52 3.66-.54 2.68-1.52 3.66-2.28 1.52-3.66 1.52z" />
        </svg>
        <input
          type="text"
          value={displayValue}
          onChange={(e) => onChange(normalizeHex(e.target.value))}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-mono text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-0"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
