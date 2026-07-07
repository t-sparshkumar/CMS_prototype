import { FormEvent, useEffect, useState } from 'react';
import Modal from './Modal';
import {
  createPolicy,
  fetchCollections,
  updatePolicy,
  type CollectionMeta,
  type PolicyMeta,
  type PolicyRule,
} from '../lib/api';
import { getApiErrorMessage } from '../lib/apiErrors';

const ACTIONS = ['create', 'read', 'update', 'delete'] as const;

interface PolicyFormModalProps {
  open: boolean;
  policy: PolicyMeta | null;
  onClose: () => void;
  onSaved: (policy: PolicyMeta) => void;
}

function buildRulesFromMatrix(
  collections: string[],
  actions: Record<(typeof ACTIONS)[number], boolean>,
): PolicyRule[] {
  const rules: PolicyRule[] = [];
  for (const collection of collections) {
    for (const action of ACTIONS) {
      if (actions[action]) {
        rules.push({ collection, action, fields: '*' });
      }
    }
  }
  return rules;
}

function rulesToMatrix(rules: PolicyRule[]): {
  collections: string[];
  actions: Record<(typeof ACTIONS)[number], boolean>;
} {
  const collections = [...new Set(rules.map((r) => r.collection))];
  const actions = { create: false, read: false, update: false, delete: false };
  for (const rule of rules) {
    actions[rule.action] = true;
  }
  return { collections, actions };
}

export default function PolicyFormModal({ open, policy, onClose, onSaved }: PolicyFormModalProps) {
  const isEdit = Boolean(policy);
  const isSystem = Boolean(policy?.is_system);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allCollections, setAllCollections] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [actions, setActions] = useState<Record<(typeof ACTIONS)[number], boolean>>({
    create: false,
    read: true,
    update: false,
    delete: false,
  });
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetchCollections({ includeHidden: true }).then((list) =>
      setCollections(
        list.filter(
          (c) => !c.system && !c.collection.startsWith('cms_') && !c.collection.includes('_translations'),
        ),
      ),
    );
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setName(policy?.name ?? '');
    setDescription(policy?.description ?? '');
    setError(null);

    if (policy?.rules?.length) {
      const matrix = rulesToMatrix(policy.rules);
      setAllCollections(matrix.collections.includes('*'));
      setSelectedCollections(matrix.collections.filter((c) => c !== '*'));
      setActions(matrix.actions);
    } else {
      setAllCollections(false);
      setSelectedCollections([]);
      setActions({ create: false, read: true, update: false, delete: false });
    }
  }, [open, policy]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const targetCollections = allCollections ? ['*'] : selectedCollections;
    const rules = buildRulesFromMatrix(targetCollections, actions);

    try {
      const saved =
        isEdit && policy
          ? await updatePolicy(policy.id, {
              name: isSystem ? undefined : name,
              description,
              rules: isSystem ? undefined : rules,
            })
          : await createPolicy({ name, description, rules });

      onSaved(saved);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, isEdit ? 'Failed to update policy' : 'Failed to create policy'));
    } finally {
      setIsSaving(false);
    }
  }

  function toggleCollection(collection: string) {
    setSelectedCollections((prev) =>
      prev.includes(collection) ? prev.filter((c) => c !== collection) : [...prev, collection],
    );
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit ${policy?.name ?? 'Policy'}` : 'Create Policy'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" form="policy-form" disabled={isSaving} className="btn-primary">
            {isSaving ? 'Saving...' : isEdit ? 'Save Policy' : 'Create Policy'}
          </button>
        </>
      }
    >
      <form id="policy-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
        <div>
          <label className="label">Policy Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Content Editor Policy"
            className="input"
            disabled={isSystem}
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this policy grant?"
            rows={2}
            className="input resize-none"
          />
        </div>

        {!isSystem && (
          <>
            <div>
              <label className="label">Collections</label>
              <label className="flex items-center gap-2 mb-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={allCollections}
                  onChange={(e) => setAllCollections(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600"
                />
                All collections (wildcard)
              </label>
              {!allCollections && (
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 p-3">
                  {collections.map((c) => (
                    <label key={c.collection} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedCollections.includes(c.collection)}
                        onChange={() => toggleCollection(c.collection)}
                        className="rounded border-slate-300 text-brand-600"
                      />
                      <code className="text-xs">{c.collection}</code>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="label">Allowed Actions</label>
              <div className="flex flex-wrap gap-3">
                {ACTIONS.map((action) => (
                  <label key={action} className="flex items-center gap-2 text-sm capitalize text-slate-700">
                    <input
                      type="checkbox"
                      checked={actions[action]}
                      onChange={(e) => setActions((prev) => ({ ...prev, [action]: e.target.checked }))}
                      className="rounded border-slate-300 text-brand-600"
                    />
                    {action}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {isSystem && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
            System policy rules are predefined. You can update the description only.
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
