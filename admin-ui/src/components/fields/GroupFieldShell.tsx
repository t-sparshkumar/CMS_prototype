import { useState } from 'react';
import type { FieldMeta } from '../../lib/api';

interface GroupFieldShellProps {
  field: FieldMeta;
  children: React.ReactNode;
}

export default function GroupFieldShell({ field, children }: GroupFieldShellProps) {
  const [open, setOpen] = useState(true);

  if (field.interface === 'group-accordion' || field.interface === 'group-detail') {
    return (
      <div className="field-group field-group-accordion col-span-12">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="field-group-accordion-trigger"
        >
          <span className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
          <span className="text-sm font-semibold text-slate-800">{field.field}</span>
          {field.note && <span className="text-xs text-slate-400 ml-2 font-normal">{field.note}</span>}
        </button>
        {open && <div className="field-group-body">{children}</div>}
      </div>
    );
  }

  return (
    <div className={`field-group col-span-12 ${field.interface === 'group-raw' ? 'field-group-raw' : ''}`}>
      {field.interface !== 'group-tab' && (
        <div className="field-group-header">
          <span className="text-sm font-semibold text-slate-800">{field.field}</span>
          {field.note && <span className="text-xs text-slate-400 ml-2">{field.note}</span>}
        </div>
      )}
      <div className="field-group-body">{children}</div>
    </div>
  );
}
