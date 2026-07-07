import { useEffect, useState } from 'react';
import DisplayTemplateBuilder from './DisplayTemplateBuilder';
import { fetchFields, type CollectionMeta, type FieldMeta } from '../../lib/api';
import { getInterfaceOption } from '../../lib/interfaceCatalog';

export interface RelationshipFormState {
  relatedCollection: string;
  relatedField: string;
  withSort: boolean;
  schemaOnDelete: string;
  layout: string;
  displayTemplate: string;
  allowedCollections: string;
}

interface FieldRelationshipEditorProps {
  collection: string;
  iface: string;
  collections: CollectionMeta[];
  value: RelationshipFormState;
  onChange: (patch: Partial<RelationshipFormState>) => void;
}

export default function FieldRelationshipEditor({
  collection,
  iface,
  collections,
  value,
  onChange,
}: FieldRelationshipEditorProps) {
  const [relatedFields, setRelatedFields] = useState<FieldMeta[]>([]);
  const option = getInterfaceOption(iface);
  const isM2o = iface === 'many-to-one' || iface === 'collection-item-dropdown';
  const isO2m = iface === 'one-to-many' || iface === 'tree-view';
  const isM2m = iface === 'many-to-many' || iface === 'collection-item-multiple-dropdown';
  const isM2a = iface === 'many-to-any';
  const isTranslations = iface === 'translations';

  useEffect(() => {
    if (!value.relatedCollection || !isM2o) {
      setRelatedFields([]);
      return;
    }
    void fetchFields(value.relatedCollection).then(setRelatedFields).catch(() => setRelatedFields([]));
  }, [value.relatedCollection, isM2o]);

  if (isTranslations) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 text-sm text-brand-900">
        <p className="font-semibold">Translations field</p>
        <p className="mt-1 text-brand-800/80">
          Use the collection Setup tab to configure translations and link a languages collection.
        </p>
      </div>
    );
  }

  if (isM2a) {
    return (
      <div className="space-y-3">
        <div>
          <label className="label">Allowed collections</label>
          <textarea
            value={value.allowedCollections}
            onChange={(e) => onChange({ allowedCollections: e.target.value })}
            rows={3}
            placeholder="pages&#10;site_components&#10;articles"
            className="textarea font-mono text-sm"
          />
          <p className="text-xs text-slate-400 mt-1">One collection name per line. Leave empty to allow any collection.</p>
        </div>
        <div>
          <label className="label">On delete</label>
          <select
            value={value.schemaOnDelete}
            onChange={(e) => onChange({ schemaOnDelete: e.target.value })}
            className="select"
          >
            <option value="SET NULL">SET NULL</option>
            <option value="CASCADE">CASCADE</option>
            <option value="RESTRICT">RESTRICT</option>
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Related collection</label>
        <select
          value={value.relatedCollection}
          onChange={(e) => onChange({ relatedCollection: e.target.value })}
          className="select"
          required={!isM2a}
        >
          <option value="">Select collection</option>
          {collections
            .filter((c) => !c.is_group && c.collection !== collection)
            .map((c) => (
              <option key={c.collection} value={c.collection}>
                {c.collection}
              </option>
            ))}
        </select>
        {option && <p className="text-xs text-slate-400 mt-1">{option.description}</p>}
      </div>

      {isM2o && value.relatedCollection && (
        <div>
          <label className="label">Display template</label>
          <DisplayTemplateBuilder
            fields={relatedFields}
            value={value.displayTemplate}
            onChange={(displayTemplate) => onChange({ displayTemplate })}
          />
          <p className="text-xs text-slate-400 mt-1">
            Controls how related items appear in dropdowns — e.g. {'{{name}}'} for an authors collection.
          </p>
        </div>
      )}

      {isO2m && (
        <>
          <div>
            <label className="label">FK field on related collection</label>
            <input
              value={value.relatedField}
              onChange={(e) => onChange({ relatedField: e.target.value })}
              placeholder="author_id"
              className="input font-mono"
            />
            <p className="text-xs text-slate-400 mt-1">
              Many-to-one field on the related collection pointing back to this item.
            </p>
          </div>
          {iface === 'tree-view' ? (
            <p className="text-xs text-slate-500 rounded-lg bg-slate-50 px-3 py-2">
              Tree view uses a hierarchical one-to-many layout. The related FK typically references the same collection.
            </p>
          ) : (
            <div>
              <label className="label">Layout</label>
              <select value={value.layout} onChange={(e) => onChange({ layout: e.target.value })} className="select">
                <option value="list">List</option>
                <option value="table">Table</option>
              </select>
            </div>
          )}
        </>
      )}

      {isM2m && (
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={value.withSort}
            onChange={(e) => onChange({ withSort: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          Enable junction sort field
        </label>
      )}

      {!isM2a && (
        <div>
          <label className="label">On delete</label>
          <select
            value={value.schemaOnDelete}
            onChange={(e) => onChange({ schemaOnDelete: e.target.value })}
            className="select"
          >
            <option value="SET NULL">SET NULL</option>
            <option value="CASCADE">CASCADE</option>
            <option value="RESTRICT">RESTRICT</option>
          </select>
        </div>
      )}
    </div>
  );
}
