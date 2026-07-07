import Icon from '../Icon';

const CASES = [
  {
    title: 'Creating a collection',
    steps: [
      'Open Data Model → New Collection and set the table name (e.g. posts).',
      'Choose primary key type (UUID or integer) and optional system fields: status, sort, accountability.',
      'Use group collections for folders; create sub-collections nested under a parent.',
      'Configure icon, color, note, singleton, hidden, sort field, and archive on the Setup tab.',
    ],
  },
  {
    title: 'Creating fields',
    steps: [
      'From a collection, click New Field and pick an interface (Input, WYSIWYG, Toggle, etc.).',
      'Set schema options: required, unique, nullable, indexed, default value, and note.',
      'Use Layout for width, group assignment, hidden, and read-only flags.',
      'Use Validation and Conditions tabs for rules and conditional visibility.',
    ],
  },
  {
    title: 'Configuring relationships',
    steps: [
      'Many to One — FK on this collection (e.g. posts.author → authors). Set a display template like {{name}}.',
      'One to Many — alias field; FK lives on the related collection pointing back here.',
      'Many to Many — junction table auto-created; optional sort on junction rows.',
      'Tree View — hierarchical O2M; related FK typically references the same collection.',
      'Builder (M2A) — polymorphic links to multiple collections via a junction table.',
      'Translations — configure on Setup tab to add a translations alias field.',
    ],
  },
  {
    title: 'Presentation & groups',
    steps: [
      'Header, Divider, Notice, and Super Header — presentational fields with no database column.',
      'Accordion, Tabs, Detail Group — group child fields using the group property.',
      'Display tab — choose how values render in lists and relation pickers.',
    ],
  },
];

export default function DataModelGuide() {
  return (
    <details className="card group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Icon name="database" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">Data model guide</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Covers collection, field, and relationship workflows inspired by{' '}
              <a
                href="https://directus.com/docs/getting-started/data-model"
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Directus
              </a>
            </p>
          </div>
        </div>
        <Icon name="chevron-right" className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" />
      </summary>
      <div className="border-t border-surface-border px-5 pb-5 pt-4 grid gap-4 sm:grid-cols-2">
        {CASES.map((section) => (
          <div key={section.title} className="rounded-xl border border-surface-border bg-surface-muted/30 p-4">
            <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
            <ol className="mt-2 space-y-1.5 text-xs text-slate-600 list-decimal list-inside">
              {section.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </details>
  );
}
