import { useEffect, useMemo, useRef, useState } from 'react';
import type { CollectionMeta } from '../lib/api';
import { getCollectionDisplayName } from '../lib/collectionDisplay';
import {
  MATRIX_ACTIONS,
  WILDCARD_COLLECTION,
  hasWildcardRow,
  type ActionKey,
  type MatrixState,
} from '../lib/policyMatrix';

interface PolicyPermissionsMatrixProps {
  matrix: MatrixState;
  collections: CollectionMeta[];
  readOnly?: boolean;
  onChange: (matrix: MatrixState) => void;
}

function ActionPill({
  action,
  active,
  disabled,
  onClick,
}: {
  action: ActionKey;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-300 hover:bg-slate-200'
      }`}
    >
      {action}
    </button>
  );
}

export default function PolicyPermissionsMatrix({
  matrix,
  collections,
  readOnly = false,
  onChange,
}: PolicyPermissionsMatrixProps) {
  const [search, setSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const collectionMetaByName = useMemo(
    () => Object.fromEntries(collections.map((c) => [c.collection, c])),
    [collections],
  );

  const matrixRows = useMemo(() => {
    const names = Object.keys(matrix);
    if (names.includes(WILDCARD_COLLECTION)) {
      return [WILDCARD_COLLECTION];
    }
    return names.sort((a, b) => a.localeCompare(b));
  }, [matrix]);

  const availableCollections = useMemo(() => {
    const inMatrix = new Set(Object.keys(matrix));
    return collections
      .filter((c) => !inMatrix.has(c.collection))
      .sort((a, b) => a.collection.localeCompare(b.collection));
  }, [collections, matrix]);

  const filteredCollections = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availableCollections;
    return availableCollections.filter((c) => {
      const displayName = getCollectionDisplayName(c).toLowerCase();
      return c.collection.toLowerCase().includes(query) || displayName.includes(query);
    });
  }, [availableCollections, search]);

  const showWildcardOption = !hasWildcardRow(matrix) && matrixRows.length === 0;

  useEffect(() => {
    if (!pickerOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [pickerOpen]);

  function toggleAction(collection: string, action: ActionKey) {
    if (readOnly) return;
    const current = matrix[collection] ?? {};
    onChange({
      ...matrix,
      [collection]: {
        ...current,
        [action]: !current[action],
      },
    });
  }

  function removeRow(collection: string) {
    if (readOnly) return;
    const next = { ...matrix };
    delete next[collection];
    onChange(next);
  }

  function addCollection(collection: string) {
    if (readOnly) return;
    if (collection === WILDCARD_COLLECTION) {
      onChange({
        [WILDCARD_COLLECTION]: { create: false, read: true, update: false, delete: false },
      });
    } else {
      onChange({
        ...matrix,
        [collection]: { create: false, read: true, update: false, delete: false },
      });
    }
    setSearch('');
    setPickerOpen(false);
  }

  function renderCollectionLabel(collection: string) {
    if (collection === WILDCARD_COLLECTION) {
      return (
        <div>
          <code className="text-sm font-medium text-slate-900">*</code>
          <p className="text-xs text-slate-500">All collections</p>
        </div>
      );
    }

    const meta = collectionMetaByName[collection];
    const displayName = meta ? getCollectionDisplayName(meta) : null;

    return (
      <div>
        <code className="text-sm font-medium text-slate-900">{collection}</code>
        {displayName && displayName !== collection && (
          <p className="text-xs text-slate-500">{displayName}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="label">Collection Permissions</label>

      {matrixRows.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-surface-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-slate-50/80">
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Collection
                </th>
                {MATRIX_ACTIONS.map((action) => (
                  <th
                    key={action}
                    className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {action}
                  </th>
                ))}
                <th className="w-12 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((collection) => (
                <tr key={collection} className="border-b border-surface-border last:border-b-0 table-row-hover">
                  <td className="px-4 py-3 align-middle">{renderCollectionLabel(collection)}</td>
                  {MATRIX_ACTIONS.map((action) => (
                    <td key={action} className="px-3 py-3 text-center align-middle">
                      <ActionPill
                        action={action}
                        active={Boolean(matrix[collection]?.[action])}
                        disabled={readOnly}
                        onClick={() => toggleAction(collection, action)}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-3 text-center align-middle">
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeRow(collection)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${collection}`}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-500">
          No collections added yet. Use the picker below to grant permissions.
        </div>
      )}

      {!readOnly && !hasWildcardRow(matrix) && (
        <div ref={pickerRef} className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPickerOpen(true);
            }}
            onFocus={() => setPickerOpen(true)}
            placeholder="Add collection..."
            className="input"
          />
          {pickerOpen && (filteredCollections.length > 0 || showWildcardOption) && (
            <div className="menu-dropdown absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto">
              {showWildcardOption && (
                <button
                  type="button"
                  onClick={() => addCollection(WILDCARD_COLLECTION)}
                  className="menu-dropdown-item w-full text-left"
                >
                  <code className="text-xs">*</code>
                  <span className="ml-2 text-slate-500">All collections</span>
                </button>
              )}
              {filteredCollections.map((c) => (
                <button
                  key={c.collection}
                  type="button"
                  onClick={() => addCollection(c.collection)}
                  className="menu-dropdown-item w-full text-left"
                >
                  <code className="text-xs">{c.collection}</code>
                  {c.display_name && (
                    <span className="ml-2 text-slate-500">{getCollectionDisplayName(c)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {pickerOpen && search && filteredCollections.length === 0 && !showWildcardOption && (
            <div className="menu-dropdown absolute left-0 right-0 z-10 mt-1 px-3.5 py-2 text-sm text-slate-500">
              No matching collections
            </div>
          )}
        </div>
      )}

      {hasWildcardRow(matrix) && (
        <p className="text-xs text-slate-500">
          Wildcard applies to all collections. Remove it to grant per-collection permissions.
        </p>
      )}
    </div>
  );
}
