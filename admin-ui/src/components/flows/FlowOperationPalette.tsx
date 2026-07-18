import { OPERATION_CATALOG } from '../../lib/flows/operationCatalog';

interface FlowOperationPaletteProps {
  onAdd: (type: string, label: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  logic: 'Logic',
  data: 'Data',
  integration: 'Integration',
  utility: 'Utility',
};

export default function FlowOperationPalette({ onAdd }: FlowOperationPaletteProps) {
  const grouped = OPERATION_CATALOG.reduce<Record<string, typeof OPERATION_CATALOG>>((acc, entry) => {
    const bucket = acc[entry.category] ?? [];
    bucket.push(entry);
    acc[entry.category] = bucket;
    return acc;
  }, {});

  return (
    <div className="flow-palette">
      <div className="flow-palette-header">
        <span className="material-symbols-outlined text-base text-slate-500">add_circle</span>
        <span>Add operation</span>
      </div>
      <div className="flow-palette-body space-y-4">
        {Object.entries(grouped).map(([category, entries]) => (
          <div key={category}>
            <p className="flow-palette-category">{CATEGORY_LABELS[category] ?? category}</p>
            <div className="space-y-1">
              {entries.map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  className="flow-palette-item"
                  onClick={() => onAdd(entry.type, entry.label)}
                >
                  <span
                    className="flow-palette-icon"
                    style={{
                      backgroundColor: `var(${entry.accentBgVar})`,
                      color: `var(${entry.accentVar})`,
                    }}
                  >
                    <span className="material-symbols-outlined text-[18px]">{entry.icon}</span>
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-sm font-medium text-slate-800">{entry.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-500">
                      {entry.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
