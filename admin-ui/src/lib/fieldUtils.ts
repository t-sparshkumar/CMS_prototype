import type { FieldMeta } from './api';

export interface SelectChoice {
  value: string;
  label: string;
}

export function getSelectChoices(field: FieldMeta): SelectChoice[] {
  const raw = field.options?.choices ?? field.options?.options;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((choice) => {
    if (typeof choice === 'string') {
      return { value: choice, label: choice };
    }
    if (typeof choice === 'object' && choice !== null) {
      const record = choice as Record<string, unknown>;
      const value = String(record.value ?? record.text ?? '');
      const label = String(record.text ?? record.label ?? value);
      return { value, label };
    }
    return { value: String(choice), label: String(choice) };
  });
}

export function humanizeFieldName(fieldName: string): string {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getFieldDisplayLabel(field: Pick<FieldMeta, 'field' | 'note'>): string {
  if (field.note) {
    const firstSentence = field.note.split('.')[0]?.trim();
    if (firstSentence && firstSentence.length <= 48) {
      return firstSentence;
    }
  }
  return humanizeFieldName(field.field);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function parseJsonValue(value: unknown): unknown {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
  return value;
}

export interface InferredRepeaterSubField {
  field: string;
  type?: string;
  interface?: string;
  note?: string;
  options?: Record<string, unknown>;
}

export function isFlatObjectArray(value: unknown): value is Record<string, unknown>[] {
  const parsed = parseJsonValue(value);
  if (!Array.isArray(parsed)) {
    return false;
  }
  if (parsed.length === 0) {
    return false;
  }
  return parsed.every(
    (row) =>
      typeof row === 'object' &&
      row !== null &&
      !Array.isArray(row) &&
      Object.values(row).every(
        (cell) =>
          cell === null ||
          cell === undefined ||
          typeof cell === 'string' ||
          typeof cell === 'number' ||
          typeof cell === 'boolean',
      ),
  );
}

export function parseRepeaterFieldsFromNote(note: string | null | undefined): InferredRepeaterSubField[] | null {
  if (!note) {
    return null;
  }
  const match = note.match(/\{\s*([^}]+)\s*\}/);
  if (!match?.[1]) {
    return null;
  }
  const keys = match[1]
    .split(',')
    .map((part) => part.trim().split(':')[0]?.trim() ?? '')
    .filter(Boolean);
  if (keys.length === 0) {
    return null;
  }
  return keys.map((field) => ({
    field,
    type: 'string',
    interface: 'input',
    note: humanizeFieldName(field),
  }));
}

export function inferRepeaterSubFields(
  field: Pick<FieldMeta, 'options' | 'note'>,
  value: unknown,
): InferredRepeaterSubField[] | null {
  const configured = field.options?.fields ?? field.options?.template;
  if (Array.isArray(configured) && configured.length > 0) {
    return configured.map((item) => {
      if (typeof item === 'object' && item !== null) {
        const record = item as Record<string, unknown>;
        return {
          field: String(record.field ?? record.name ?? 'value'),
          type: record.type ? String(record.type) : 'string',
          interface: record.interface ? String(record.interface) : 'input',
          note: record.note ? String(record.note) : humanizeFieldName(String(record.field ?? 'value')),
          options:
            typeof record.options === 'object' && record.options !== null
              ? (record.options as Record<string, unknown>)
              : undefined,
        };
      }
      return { field: String(item), type: 'string', interface: 'input', note: humanizeFieldName(String(item)) };
    });
  }

  const fromNote = parseRepeaterFieldsFromNote(field.note);
  if (fromNote) {
    return fromNote;
  }

  const parsed = parseJsonValue(value);
  if (isFlatObjectArray(parsed)) {
    const keys = [...new Set(parsed.flatMap((row) => Object.keys(row)))];
    if (keys.length > 0) {
      return keys.map((key) => ({
        field: key,
        type: 'string',
        interface: 'input',
        note: humanizeFieldName(key),
      }));
    }
  }

  return null;
}

export function shouldUseStructuredJsonEditor(
  field: Pick<FieldMeta, 'interface' | 'type' | 'options' | 'note'>,
  value: unknown,
): boolean {
  if (field.interface === 'repeater') {
    return true;
  }
  return inferRepeaterSubFields(field, value) !== null;
}

export function stringifyJsonValue(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value) {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

export function isGroupContainer(field: FieldMeta): boolean {
  return field.interface.startsWith('group-');
}

export function isPresentationalField(field: FieldMeta): boolean {
  return (
    field.type === 'alias' &&
    (field.interface.startsWith('group-') ||
      ['header', 'super-header', 'divider', 'notice', 'presentation-buttons', 'presentation-m2a'].includes(
        field.interface,
      ))
  );
}

export function colSpanClass(width?: number | null, field?: Pick<FieldMeta, 'field' | 'interface'>): string {
  if (field?.field === 'status' && field.interface === 'select-dropdown') {
    return 'col-span-12 sm:col-span-3';
  }
  if (field?.field === 'sort') {
    return 'col-span-12 sm:col-span-3';
  }
  if (width === 4) return 'col-span-12 sm:col-span-4';
  if (width === 6) return 'col-span-12 sm:col-span-6';
  return 'col-span-12';
}

export function markdownToHtml(md: string): string {
  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-3 mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 text-xs font-mono">$1</code>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-brand-600 underline" target="_blank" rel="noreferrer">$1</a>',
    )
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br />');
}

export interface TreeNode {
  key: string;
  label: string;
  children: TreeNode[];
}

export function buildChoiceTree(choices: SelectChoice[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const choice of choices) {
    const parts = choice.value.split('.').filter(Boolean);
    let level = root;
    let path = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      path = path ? `${path}.${part}` : part;
      let node = level.find((n) => n.key === path);
      if (!node) {
        node = {
          key: path,
          label: i === parts.length - 1 ? choice.label : part,
          children: [],
        };
        level.push(node);
      }
      level = node.children;
    }
  }

  return root;
}

export function getDefaultPreviewValue(iface: string, type?: string): unknown {
  switch (iface) {
    case 'toggle':
      return true;
    case 'number':
    case 'slider':
      return 42;
    case 'color':
      return '#6366f1';
    case 'datetime':
      return new Date().toISOString().slice(0, 16);
    case 'date':
      return new Date().toISOString().slice(0, 10);
    case 'tags':
      return ['sample', 'preview'];
    case 'checkboxes':
    case 'select-multiple-dropdown':
      return ['option_a'];
    case 'checkboxes-tree':
      return { parent: { child: true } };
    case 'json':
    case 'block-editor':
      return { key: 'value' };
    case 'repeater':
      return [{ text: 'Row 1' }];
    case 'seo':
      return { title: 'Page title', description: 'Meta description for search engines.', og_image: null };
    case 'map':
      return { lat: 28.6139, lng: 77.209 };
    case 'files':
      return [];
    case 'markdown':
      return '# Hello\n\nThis is **markdown** preview content.';
    case 'wysiwyg':
      return '<p>Rich text <strong>preview</strong> content.</p>';
    case 'code':
      return 'const hello = "world";';
    default:
      if (type === 'boolean') return false;
      if (type === 'json') return {};
      if (type === 'text') return 'Sample text content';
      return 'Sample value';
  }
}
