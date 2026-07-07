import { buildChoiceTree, getSelectChoices, type TreeNode } from '../../lib/fieldUtils';
import { EmptyChoicesHint, FieldLabel } from './fieldShared';
import type { FieldMeta } from '../../lib/api';

interface CheckboxesTreeFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

function getNestedValue(obj: Record<string, unknown>, path: string): boolean {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return Boolean(current);
}

function setNestedValue(obj: Record<string, unknown>, path: string, checked: boolean): Record<string, unknown> {
  const parts = path.split('.');
  const result = { ...obj };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    const existing = current[part];
    current[part] = typeof existing === 'object' && existing !== null ? { ...(existing as Record<string, unknown>) } : {};
    current = current[part] as Record<string, unknown>;
  }

  const last = parts[parts.length - 1]!;
  if (checked) {
    current[last] = true;
  } else {
    delete current[last];
  }

  return result;
}

function TreeLevel({
  nodes,
  depth,
  state,
  disabled,
  onToggle,
}: {
  nodes: TreeNode[];
  depth: number;
  state: Record<string, unknown>;
  disabled?: boolean;
  onToggle: (path: string, checked: boolean) => void;
}) {
  return (
    <ul className={depth > 0 ? 'ml-5 mt-1 space-y-1 border-l border-slate-200 pl-3' : 'space-y-1'}>
      {nodes.map((node) => (
        <li key={node.key}>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={getNestedValue(state, node.key)}
              disabled={disabled}
              onChange={(e) => onToggle(node.key, e.target.checked)}
              className="rounded border-slate-300"
            />
            {node.label}
          </label>
          {node.children.length > 0 && (
            <TreeLevel
              nodes={node.children}
              depth={depth + 1}
              state={state}
              disabled={disabled}
              onToggle={onToggle}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function CheckboxesTreeField({ field, value, onChange, disabled }: CheckboxesTreeFieldProps) {
  const choices = getSelectChoices(field);
  const tree = buildChoiceTree(choices);
  const state =
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  function handleToggle(path: string, checked: boolean) {
    onChange(setNestedValue(state, path, checked));
  }

  return (
    <div>
      <FieldLabel field={field} />
      {tree.length === 0 ? (
        <EmptyChoicesHint fieldName={field.field} />
      ) : (
        <TreeLevel nodes={tree} depth={0} state={state} disabled={disabled} onToggle={handleToggle} />
      )}
    </div>
  );
}
