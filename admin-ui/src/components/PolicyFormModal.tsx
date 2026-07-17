import { FormEvent, useEffect, useState } from 'react';
import Modal from './Modal';
import PolicyPermissionsMatrix from './PolicyPermissionsMatrix';
import {
  createPolicy,
  fetchCollections,
  updatePolicy,
  type CollectionMeta,
  type PolicyMeta,
  type PolicyRule,
} from '../lib/api';
import { getApiErrorMessage } from '../lib/apiErrors';
import {
  matrixToRules,
  rulesToPerCollectionMatrix,
  validateMatrix,
  type MatrixState,
} from '../lib/policyMatrix';

interface PolicyFormModalProps {
  open: boolean;
  policy: PolicyMeta | null;
  onClose: () => void;
  onSaved: (policy: PolicyMeta) => void;
}

const EMPTY_MATRIX: MatrixState = {};

export default function PolicyFormModal({ open, policy, onClose, onSaved }: PolicyFormModalProps) {
  const isEdit = Boolean(policy);
  const isSystem = Boolean(policy?.is_system);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [matrix, setMatrix] = useState<MatrixState>(EMPTY_MATRIX);
  const [existingRules, setExistingRules] = useState<PolicyRule[]>([]);
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetchCollections({ includeHidden: true }).then((list) =>
      setCollections(
        list.filter((c) => !c.system && !c.collection.startsWith('cms_')),
      ),
    );
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setName(policy?.name ?? '');
    setDescription(policy?.description ?? '');
    setError(null);

    if (policy?.rules?.length) {
      setExistingRules(policy.rules);
      setMatrix(rulesToPerCollectionMatrix(policy.rules));
    } else {
      setExistingRules([]);
      setMatrix(EMPTY_MATRIX);
    }
  }, [open, policy]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const matrixError = validateMatrix(matrix);
    if (matrixError) {
      setError(matrixError);
      return;
    }

    const rules = matrixToRules(matrix, existingRules);
    setIsSaving(true);

    try {
      const saved =
        isEdit && policy
          ? await updatePolicy(policy.id, {
              name: isSystem ? undefined : name,
              description,
              rules,
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

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit ${policy?.name ?? 'Policy'}` : 'Create Policy'}
      onClose={onClose}
      size="xl"
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

        {isSystem && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
            System policy name is read-only. You can update the description and collection permissions below.
          </div>
        )}

        <PolicyPermissionsMatrix
          matrix={matrix}
          collections={collections}
          onChange={setMatrix}
        />

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
