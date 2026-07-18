import { useState } from 'react';

const VARIABLES = [
  { label: 'Trigger type', value: '$trigger.type' },
  { label: 'Trigger collection', value: '$trigger.collection' },
  { label: 'Trigger keys', value: '$trigger.keys' },
  { label: 'Trigger payload', value: '$trigger.payload' },
  { label: 'Last output', value: '$last' },
  { label: 'Env example', value: '$env.EXAMPLE' },
  { label: 'Accountability user', value: '$accountability.user' },
  { label: 'Accountability role', value: '$accountability.role' },
];

interface FlowVariablePickerProps {
  onInsert: (variable: string) => void;
}

export default function FlowVariablePicker({ onInsert }: FlowVariablePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        className="btn-secondary whitespace-nowrap px-2.5 py-2 text-xs"
        onClick={() => setOpen((prev) => !prev)}
      >
        {'{{ }}'}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-surface-border bg-white p-2 shadow-lg">
          {VARIABLES.map((entry) => (
            <button
              key={entry.value}
              type="button"
              className="block w-full rounded-lg px-2.5 py-2 text-left text-xs hover:bg-slate-50"
              onClick={() => {
                onInsert(entry.value);
                setOpen(false);
              }}
            >
              <span className="font-medium text-slate-800">{entry.label}</span>
              <span className="mt-0.5 block font-mono text-slate-500">{entry.value}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
