import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../Icon';
import {
  deleteField,
  duplicateField,
  fetchFields,
  reorderFields,
  updateField,
  type FieldMeta,
} from '../../lib/api';
import { getApiErrorMessage } from '../../lib/apiErrors';
import FieldCard from './FieldCard';
import ConfirmDialog from './ConfirmDialog';

interface FieldsManagementProps {
  collection: string;
}

export default function FieldsManagement({ collection }: FieldsManagementProps) {
  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [search, setSearch] = useState('');
  const [showSystem, setShowSystem] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFields(await fetchFields(collection));
  }, [collection]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedFields = useMemo(() => {
    return [...fields].sort((a, b) => a.sort - b.sort || a.id - b.id);
  }, [fields]);

  const topLevelFields = useMemo(() => {
    return sortedFields.filter((f) => {
      if (!showSystem && f.is_system) return false;
      if (!f.group) return true;
      return false;
    }).filter((f) => {
      if (!search) return true;
      return f.field.toLowerCase().includes(search.toLowerCase());
    });
  }, [sortedFields, showSystem, search]);

  const childrenByGroup = useMemo(() => {
    const map = new Map<string, FieldMeta[]>();
    for (const field of sortedFields) {
      if (!field.group) continue;
      if (!showSystem && field.is_system) continue;
      const list = map.get(field.group) ?? [];
      list.push(field);
      map.set(field.group, list);
    }
    return map;
  }, [sortedFields, showSystem]);

  async function persistReorder(reordered: FieldMeta[]) {
    await reorderFields(
      collection,
      reordered.map((f, index) => ({ field: f.field, sort: index + 1, group: f.group })),
    );
    await load();
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const reordered = [...topLevelFields];
    const [moved] = reordered.splice(dragIndex, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);
    void persistReorder(reordered);
    setDragIndex(null);
  }

  return (
    <div className="space-y-3">
      <div className="dm-field-toolbar">
        <div className="collection-list-search max-w-xs">
          <Icon name="search" className="collection-list-search-icon h-3.5 w-3.5" />
          <input
            type="search"
            placeholder="Search fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="collection-list-search-input"
          />
        </div>
        <label>
          <input
            type="checkbox"
            checked={showSystem}
            onChange={(e) => setShowSystem(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-[var(--app-border)] text-[var(--app-accent)] focus:ring-[var(--app-accent)]"
          />
          System fields
        </label>
        <Link to={`/settings/data-model/${collection}/fields/new`} className="btn-primary text-sm ml-auto">
          <Icon name="plus" className="h-4 w-4" />
          Create Field
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {topLevelFields.length === 0 ? (
        <div className="dm-empty">
          <span className="dm-empty-icon">
            <Icon name="database" className="h-5 w-5" />
          </span>
          <p className="text-sm mb-3">No fields yet.</p>
          <Link to={`/settings/data-model/${collection}/fields/new`} className="btn-primary text-sm">
            <Icon name="plus" className="h-4 w-4" />
            Add your first field
          </Link>
        </div>
      ) : (
        <div className="space-y-1.5">
          {topLevelFields.map((field, index) => (
            <div key={field.id}>
              <FieldCard
                collection={collection}
                field={field}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                onToggleHidden={() => void updateField(collection, field.field, { hidden: !field.hidden }).then(load)}
                onSetWidth={(width) => void updateField(collection, field.field, { width }).then(load)}
                onDuplicate={() => void duplicateField(collection, field.field).then(load)}
                onDelete={() => setDeleteTarget(field.field)}
              />
              {childrenByGroup.get(field.field)?.map((child) => (
                <div key={child.id} className="ml-6 mt-1.5">
                  <FieldCard
                    collection={collection}
                    field={child}
                    onToggleHidden={() => void updateField(collection, child.field, { hidden: !child.hidden }).then(load)}
                    onSetWidth={(width) => void updateField(collection, child.field, { width }).then(load)}
                    onDuplicate={() => void duplicateField(collection, child.field).then(load)}
                    onDelete={() => setDeleteTarget(child.field)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete field"
        message={`Delete field "${deleteTarget}"? This drops the column and cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleteTarget) return;
          void deleteField(collection, deleteTarget)
            .then(load)
            .catch((err) => setError(getApiErrorMessage(err, 'Failed to delete field')))
            .finally(() => setDeleteTarget(null));
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
