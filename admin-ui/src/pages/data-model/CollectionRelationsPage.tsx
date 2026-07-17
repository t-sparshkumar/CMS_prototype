import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DisplayTemplateBuilder from '../../components/data-model/DisplayTemplateBuilder';
import Icon from '../../components/Icon';
import {
  createField,
  deleteRelation,
  fetchCollections,
  fetchFields,
  fetchRelations,
  updateRelation,
  type CollectionMeta,
  type FieldMeta,
  type RelationMeta,
} from '../../lib/api';
import {
  isManyToManyInterface,
  isManyToOneInterface,
  isOneToManyInterface,
  RELATION_INTERFACE_OPTIONS,
} from '../../lib/interfaceCatalog';
import ConfirmDialog from '../../components/data-model/ConfirmDialog';
import TableRowActions from '../../components/TableRowActions';

export default function CollectionRelationsPage() {
  const { collection = '' } = useParams<{ collection: string }>();
  const [relations, setRelations] = useState<RelationMeta[]>([]);
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [iface, setIface] = useState('many-to-one');
  const [relatedCollection, setRelatedCollection] = useState('');
  const [relatedField, setRelatedField] = useState('');
  const [onDelete, setOnDelete] = useState('SET NULL');
  const [displayTemplate, setDisplayTemplate] = useState('');
  const [allowedCollections, setAllowedCollections] = useState('');
  const [withSort, setWithSort] = useState(false);
  const [relatedFields, setRelatedFields] = useState<FieldMeta[]>([]);

  async function load() {
    const [rels, cols] = await Promise.all([
      fetchRelations(collection),
      fetchCollections({ includeHidden: true }),
    ]);
    setRelations(rels);
    setCollections(cols);
  }

  useEffect(() => {
    void load();
  }, [collection]);

  useEffect(() => {
    if (!relatedCollection || !isManyToOneInterface(iface)) {
      setRelatedFields([]);
      return;
    }
    void fetchFields(relatedCollection).then(setRelatedFields).catch(() => setRelatedFields([]));
  }, [relatedCollection, iface]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const options: Record<string, unknown> = {
      schema_on_delete: onDelete,
    };
    if (iface === 'many-to-any') {
      const allowed = allowedCollections
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (allowed.length > 0) {
        options.allowed_collections = allowed;
      }
    } else {
      options.related_collection = relatedCollection;
    }
    if (isOneToManyInterface(iface)) {
      options.related_field = relatedField;
      options.layout = iface === 'tree-view' ? 'tree' : 'list';
    }
    if (isManyToManyInterface(iface)) {
      options.with_sort = withSort;
    }
    if (isManyToOneInterface(iface) && displayTemplate) {
      options.template = displayTemplate;
    }
    await createField(collection, {
      field: fieldName.trim(),
      interface: iface,
      options,
    });
    setFieldName('');
    setDisplayTemplate('');
    setAllowedCollections('');
    await load();
  }

  function relationKind(rel: RelationMeta): string {
    if (rel.one_collection === '*') return 'M2A';
    if (rel.junction_collection) return 'M2M';
    if (rel.many_collection === collection) return 'M2O';
    return 'O2M';
  }

  return (
    <div className="space-y-6">
      <form onSubmit={(e) => void handleCreate(e)} className="form-section grid sm:grid-cols-2 gap-4">
        <h2 className="sm:col-span-2 form-section-title border-0 pb-0 mb-0">
          <Icon name="component" className="h-4 w-4 text-slate-400" />
          Create relation field
        </h2>
        <div>
          <label className="label">Field name</label>
          <input value={fieldName} onChange={(e) => setFieldName(e.target.value)} placeholder="author" required className="input font-mono" />
        </div>
        <div>
          <label className="label">Relation type</label>
          <select value={iface} onChange={(e) => setIface(e.target.value)} className="select">
            {RELATION_INTERFACE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {iface !== 'many-to-any' && (
          <div>
            <label className="label">Related collection</label>
            <select value={relatedCollection} onChange={(e) => setRelatedCollection(e.target.value)} required className="select">
              <option value="">Select collection</option>
              {collections.filter((c) => !c.is_group && c.collection !== collection).map((c) => (
                <option key={c.collection} value={c.collection}>{c.collection}</option>
              ))}
            </select>
          </div>
        )}
        {isManyToOneInterface(iface) && relatedCollection && (
          <div className="sm:col-span-2">
            <label className="label">Display template</label>
            <DisplayTemplateBuilder fields={relatedFields} value={displayTemplate} onChange={setDisplayTemplate} />
          </div>
        )}
        {isOneToManyInterface(iface) && (
          <div>
            <label className="label">FK on related</label>
            <input value={relatedField} onChange={(e) => setRelatedField(e.target.value)} placeholder="related_id" required className="input font-mono" />
          </div>
        )}
        {isManyToManyInterface(iface) && (
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
            <input type="checkbox" checked={withSort} onChange={(e) => setWithSort(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
            Enable junction sort
          </label>
        )}
        {iface === 'many-to-any' && (
          <div className="sm:col-span-2">
            <label className="label">Allowed collections (one per line)</label>
            <textarea value={allowedCollections} onChange={(e) => setAllowedCollections(e.target.value)} rows={3} className="textarea font-mono text-sm" />
          </div>
        )}
        <div>
          <label className="label">On delete</label>
          <select value={onDelete} onChange={(e) => setOnDelete(e.target.value)} className="select">
            <option value="SET NULL">SET NULL</option>
            <option value="CASCADE">CASCADE</option>
            <option value="RESTRICT">RESTRICT</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary">Create relation</button>
        </div>
      </form>

      <div className="table-shell">
        <div className="table-scroll">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="table-th">Field</th>
              <th className="table-th">Type</th>
              <th className="table-th">Related</th>
              <th className="table-th">On delete</th>
              <th className="table-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {relations.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state py-12">
                  <p className="text-sm text-slate-500">No relations defined yet.</p>
                </td>
              </tr>
            ) : (
              relations.map((rel) => {
                const kind = relationKind(rel);
                const isMany = rel.many_collection === collection;
                const fieldKey = isMany ? rel.many_field : rel.sort_field ?? rel.one_field;
                const relatedLabel =
                  rel.one_collection === '*'
                    ? 'Any collection'
                    : isMany
                      ? rel.one_collection
                      : rel.many_collection;
                return (
                  <tr key={rel.id} className="table-row-hover">
                    <td className="table-td">
                      <Link to={`/settings/data-model/${collection}/fields/${fieldKey}`} className="font-medium text-brand-600 hover:text-brand-700">
                        {fieldKey}
                      </Link>
                    </td>
                    <td className="table-td"><span className="badge-blue">{kind}</span></td>
                    <td className="table-td font-mono text-xs">{relatedLabel}</td>
                    <td className="table-td">
                      <select
                        value={rel.schema_on_delete ?? 'SET NULL'}
                        onChange={(e) => void updateRelation(rel.id, { schema_on_delete: e.target.value }).then(load)}
                        className="select py-1.5 text-xs min-w-[120px]"
                      >
                        <option value="SET NULL">SET NULL</option>
                        <option value="CASCADE">CASCADE</option>
                        <option value="RESTRICT">RESTRICT</option>
                      </select>
                    </td>
                    <td className="table-td-actions">
                      <TableRowActions
                        showEdit={false}
                        onDelete={() => setDeleteId(rel.id)}
                        itemLabel={fieldKey}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete relation"
        message="Remove this relation metadata?"
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId === null) return;
          void deleteRelation(deleteId).then(load).finally(() => setDeleteId(null));
        }}
      />
    </div>
  );
}
