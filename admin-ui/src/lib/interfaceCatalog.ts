export type InterfaceGroup =
  | 'Text & Numbers'
  | 'Selection'
  | 'Relational'
  | 'Presentation'
  | 'Groups'
  | 'Other';

export type InterfaceKind = 'scalar' | 'relation' | 'presentational' | 'group' | 'file';

export type InterfaceIconId =
  | 'input'
  | 'autocomplete'
  | 'block-editor'
  | 'code'
  | 'textarea'
  | 'wysiwyg'
  | 'markdown'
  | 'tags'
  | 'seo'
  | 'toggle'
  | 'datetime'
  | 'repeater'
  | 'map'
  | 'color'
  | 'dropdown'
  | 'icon'
  | 'checkboxes'
  | 'checkboxes-tree'
  | 'dropdown-multiple'
  | 'radio'
  | 'file'
  | 'image'
  | 'files'
  | 'm2a'
  | 'm2m'
  | 'o2m'
  | 'tree'
  | 'm2o'
  | 'translations'
  | 'header'
  | 'divider'
  | 'buttons'
  | 'notice'
  | 'm2a-button'
  | 'super-header'
  | 'accordion'
  | 'detail-group'
  | 'raw-group'
  | 'tabs'
  | 'tab-group'
  | 'collection-dropdown'
  | 'collection-dropdown-multiple'
  | 'hash'
  | 'slider'
  | 'number'
  | 'json'
  | 'slug';

export interface InterfaceOption {
  id: string;
  label: string;
  group: InterfaceGroup;
  description: string;
  icon: InterfaceIconId;
  kind: InterfaceKind;
  defaultType?: string;
}

export const INTERFACE_GROUP_ORDER: InterfaceGroup[] = [
  'Text & Numbers',
  'Selection',
  'Relational',
  'Presentation',
  'Groups',
  'Other',
];

export const INTERFACE_CATALOG: InterfaceOption[] = [
  { id: 'input', label: 'Input', group: 'Text & Numbers', description: 'Single line text', icon: 'input', kind: 'scalar', defaultType: 'string' },
  { id: 'autocomplete', label: 'Autocomplete Input', group: 'Text & Numbers', description: 'Text with suggestions', icon: 'autocomplete', kind: 'scalar', defaultType: 'string' },
  { id: 'block-editor', label: 'Block Editor', group: 'Text & Numbers', description: 'Structured content blocks', icon: 'block-editor', kind: 'scalar', defaultType: 'json' },
  { id: 'code', label: 'Code', group: 'Text & Numbers', description: 'Syntax-friendly code editor', icon: 'code', kind: 'scalar', defaultType: 'text' },
  { id: 'textarea', label: 'Textarea', group: 'Text & Numbers', description: 'Multi-line plain text', icon: 'textarea', kind: 'scalar', defaultType: 'text' },
  { id: 'wysiwyg', label: 'WYSIWYG', group: 'Text & Numbers', description: 'Rich text editor', icon: 'wysiwyg', kind: 'scalar', defaultType: 'text' },
  { id: 'markdown', label: 'Markdown', group: 'Text & Numbers', description: 'Markdown editor', icon: 'markdown', kind: 'scalar', defaultType: 'text' },
  { id: 'tags', label: 'Tags', group: 'Text & Numbers', description: 'Comma-separated tags', icon: 'tags', kind: 'scalar', defaultType: 'csv' },
  { id: 'seo', label: 'SEO Interface', group: 'Text & Numbers', description: 'Title, description, and OG fields', icon: 'seo', kind: 'scalar', defaultType: 'json' },
  { id: 'number', label: 'Number', group: 'Text & Numbers', description: 'Numeric input', icon: 'number', kind: 'scalar', defaultType: 'integer' },
  { id: 'slug', label: 'Slug', group: 'Text & Numbers', description: 'URL-safe slug', icon: 'input', kind: 'scalar', defaultType: 'string' },

  { id: 'toggle', label: 'Toggle', group: 'Selection', description: 'On / off switch', icon: 'toggle', kind: 'scalar', defaultType: 'boolean' },
  { id: 'datetime', label: 'Datetime', group: 'Selection', description: 'Date and time picker', icon: 'datetime', kind: 'scalar', defaultType: 'datetime' },
  { id: 'repeater', label: 'Repeater', group: 'Selection', description: 'Repeatable field groups', icon: 'repeater', kind: 'scalar', defaultType: 'json' },
  { id: 'map', label: 'Map', group: 'Selection', description: 'Latitude and longitude', icon: 'map', kind: 'scalar', defaultType: 'json' },
  { id: 'color', label: 'Color', group: 'Selection', description: 'Color picker', icon: 'color', kind: 'scalar', defaultType: 'string' },
  { id: 'select-dropdown', label: 'Dropdown', group: 'Selection', description: 'Single select', icon: 'dropdown', kind: 'scalar', defaultType: 'string' },
  { id: 'icon', label: 'Icon', group: 'Selection', description: 'Icon picker', icon: 'icon', kind: 'scalar', defaultType: 'string' },
  { id: 'checkboxes', label: 'Checkboxes', group: 'Selection', description: 'Multiple checkbox options', icon: 'checkboxes', kind: 'scalar', defaultType: 'json' },
  { id: 'checkboxes-tree', label: 'Checkboxes (Tree)', group: 'Selection', description: 'Nested checkbox tree', icon: 'checkboxes-tree', kind: 'scalar', defaultType: 'json' },
  { id: 'select-multiple-dropdown', label: 'Dropdown (Multiple)', group: 'Selection', description: 'Multi-select dropdown', icon: 'dropdown-multiple', kind: 'scalar', defaultType: 'json' },
  { id: 'radio-buttons', label: 'Radio Buttons', group: 'Selection', description: 'Single choice radio group', icon: 'radio', kind: 'scalar', defaultType: 'string' },

  { id: 'file', label: 'File', group: 'Relational', description: 'Single file upload', icon: 'file', kind: 'file', defaultType: 'uuid' },
  { id: 'file-image', label: 'Image', group: 'Relational', description: 'Image upload', icon: 'image', kind: 'file', defaultType: 'uuid' },
  { id: 'files', label: 'Files', group: 'Relational', description: 'Multiple file uploads', icon: 'files', kind: 'scalar', defaultType: 'json' },
  { id: 'many-to-any', label: 'Builder (M2A)', group: 'Relational', description: 'Polymorphic relations', icon: 'm2a', kind: 'relation' },
  { id: 'many-to-many', label: 'Many to Many', group: 'Relational', description: 'Junction table relation', icon: 'm2m', kind: 'relation' },
  { id: 'one-to-many', label: 'One to Many', group: 'Relational', description: 'Related items list', icon: 'o2m', kind: 'relation' },
  { id: 'tree-view', label: 'Tree View', group: 'Relational', description: 'Hierarchical one-to-many', icon: 'tree', kind: 'relation' },
  { id: 'many-to-one', label: 'Many to One', group: 'Relational', description: 'Foreign key relation', icon: 'm2o', kind: 'relation' },
  { id: 'translations', label: 'Translations', group: 'Relational', description: 'Multi-language fields', icon: 'translations', kind: 'relation' },

  { id: 'header', label: 'Header', group: 'Presentation', description: 'Section heading', icon: 'header', kind: 'presentational' },
  { id: 'divider', label: 'Divider', group: 'Presentation', description: 'Visual separator', icon: 'divider', kind: 'presentational' },
  { id: 'presentation-buttons', label: 'Buttons', group: 'Presentation', description: 'Action button row', icon: 'buttons', kind: 'presentational' },
  { id: 'notice', label: 'Notice', group: 'Presentation', description: 'Informational callout', icon: 'notice', kind: 'presentational' },
  { id: 'presentation-m2a', label: 'Builder (M2A) Button', group: 'Presentation', description: 'M2A builder trigger', icon: 'm2a-button', kind: 'presentational' },
  { id: 'super-header', label: 'Super Header', group: 'Presentation', description: 'Prominent section title', icon: 'super-header', kind: 'presentational' },

  { id: 'group-accordion', label: 'Accordion', group: 'Groups', description: 'Collapsible field group', icon: 'accordion', kind: 'group' },
  { id: 'group-detail', label: 'Detail Group', group: 'Groups', description: 'Expandable detail panel', icon: 'detail-group', kind: 'group' },
  { id: 'group-raw', label: 'Raw Group', group: 'Groups', description: 'Unstyled field group', icon: 'raw-group', kind: 'group' },
  { id: 'group-tabs', label: 'Tabs', group: 'Groups', description: 'Tabbed field layout', icon: 'tabs', kind: 'group' },
  { id: 'group-tab', label: 'Tab Group', group: 'Groups', description: 'Single tab container', icon: 'tab-group', kind: 'group' },

  { id: 'collection-item-dropdown', label: 'Collection Item Dropdown', group: 'Other', description: 'Pick one related item', icon: 'collection-dropdown', kind: 'relation' },
  { id: 'collection-item-multiple-dropdown', label: 'Collection Item Dropdown (Multiple)', group: 'Other', description: 'Pick multiple related items', icon: 'collection-dropdown-multiple', kind: 'relation' },
  { id: 'hash', label: 'Hash', group: 'Other', description: 'Masked secret value', icon: 'hash', kind: 'scalar', defaultType: 'hash' },
  { id: 'slider', label: 'Slider', group: 'Other', description: 'Numeric range slider', icon: 'slider', kind: 'scalar', defaultType: 'integer' },
  { id: 'json', label: 'JSON', group: 'Other', description: 'Raw JSON editor', icon: 'json', kind: 'scalar', defaultType: 'json' },
];

const catalogById = new Map(INTERFACE_CATALOG.map((item) => [item.id, item]));

export function getInterfaceOption(id: string): InterfaceOption | undefined {
  return catalogById.get(id);
}

export function isRelationInterface(id: string): boolean {
  const option = getInterfaceOption(id);
  if (option?.kind === 'relation') return true;
  return ['many-to-one', 'one-to-many', 'many-to-many', 'many-to-any', 'translations', 'tree-view', 'collection-item-dropdown', 'collection-item-multiple-dropdown'].includes(id);
}

export function isAliasInterface(id: string): boolean {
  const option = getInterfaceOption(id);
  return option?.kind === 'presentational' || option?.kind === 'group';
}

export function isTranslationsInterface(id: string): boolean {
  return id === 'translations';
}

export function getDefaultTypeForInterface(id: string): string | undefined {
  if (isTranslationsInterface(id)) return 'alias';
  const option = getInterfaceOption(id);
  if (option?.kind === 'presentational' || option?.kind === 'group') return 'alias';
  if (option?.kind === 'relation') return undefined;
  return option?.defaultType;
}

export const RELATION_INTERFACE_OPTIONS = [
  { id: 'many-to-one', label: 'Many to One (M2O)' },
  { id: 'one-to-many', label: 'One to Many (O2M)' },
  { id: 'many-to-many', label: 'Many to Many (M2M)' },
  { id: 'tree-view', label: 'Tree View (hierarchical O2M)' },
  { id: 'many-to-any', label: 'Builder (M2A)' },
  { id: 'collection-item-dropdown', label: 'Collection Item Dropdown (M2O)' },
  { id: 'collection-item-multiple-dropdown', label: 'Collection Item Dropdown — Multiple (M2M)' },
] as const;

export function isManyToManyInterface(id: string): boolean {
  return id === 'many-to-many' || id === 'collection-item-multiple-dropdown';
}

export function isOneToManyInterface(id: string): boolean {
  return id === 'one-to-many' || id === 'tree-view';
}

export function isManyToOneInterface(id: string): boolean {
  return id === 'many-to-one' || id === 'collection-item-dropdown';
}

export function normalizeRelationInterface(id: string): string {
  if (id === 'tree-view') return 'one-to-many';
  if (id === 'collection-item-dropdown') return 'many-to-one';
  if (id === 'collection-item-multiple-dropdown') return 'many-to-many';
  return id;
}

export const ICON_OPTIONS = [
  'article', 'book', 'folder', 'image', 'person', 'settings', 'store', 'tag', 'widgets',
  'description', 'inventory', 'category', 'link', 'language', 'public',
];
