import { FormEvent, useEffect, useState } from 'react';
import Modal from './Modal';
import { createRole, updateRole, type RoleMeta } from '../lib/api';
import { getApiErrorMessage } from '../lib/apiErrors';

interface RoleFormModalProps {
  open: boolean;
  role: RoleMeta | null;
  onClose: () => void;
  onSaved: (role: RoleMeta) => void;
}

export default function RoleFormModal({ open, role, onClose, onSaved }: RoleFormModalProps) {
  const isEdit = Boolean(role);
  const isSystem = role?.admin_access || role?.name === 'Public';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [appAccess, setAppAccess] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setAppAccess(role?.app_access ?? true);
    setError(null);
  }, [open, role]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const saved = isEdit && role
        ? await updateRole(role.id, {
            name: isSystem && role.name === 'Public' ? undefined : name,
            description,
            app_access: role.name === 'Public' ? false : appAccess,
          })
        : await createRole({ name, description, app_access: appAccess });

      onSaved(saved);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, isEdit ? 'Failed to update role' : 'Failed to create role'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit ${role?.name ?? 'Role'}` : 'Create Role'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" form="role-form" disabled={isSaving} className="btn-primary">
            {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Role'}
          </button>
        </>
      }
    >
      <form id="role-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="label">Role Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Editor, Content Manager"
            className="input"
            disabled={isSystem && role?.name !== undefined && role.name !== 'Public'}
          />
          {isSystem && role?.name !== 'Public' && (
            <p className="text-xs text-slate-400 mt-1.5">System role names cannot be changed.</p>
          )}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What can users with this role do?"
            rows={3}
            className="input resize-none"
          />
        </div>

        {!isSystem && (
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50">
            <input
              type="checkbox"
              checked={appAccess}
              onChange={(e) => setAppAccess(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="block text-sm font-medium text-slate-900">App access</span>
              <span className="block text-xs text-slate-500 mt-0.5">
                Allow users with this role to sign in to the CMS admin.
              </span>
            </span>
          </label>
        )}

        {isSystem && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
            {role?.admin_access
              ? 'Administrator is a protected system role with full access.'
              : 'Public is a protected system role for unauthenticated API access.'}
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
