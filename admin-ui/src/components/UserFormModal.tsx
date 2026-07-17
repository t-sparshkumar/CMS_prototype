import { FormEvent, useEffect, useState } from 'react';
import Modal from './Modal';
import { createUser, fetchRoles, updateUser, type RoleMeta, type UserListEntry } from '../lib/api';
import { getApiErrorMessage } from '../lib/apiErrors';

interface UserFormModalProps {
  open: boolean;
  user: UserListEntry | null;
  onClose: () => void;
  onSaved: (user: UserListEntry) => void;
}

export default function UserFormModal({ open, user, onClose, onSaved }: UserFormModalProps) {
  const isEdit = Boolean(user);

  const [roles, setRoles] = useState<RoleMeta[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('active');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    async function loadRoles() {
      const roleList = await fetchRoles();
      const assignable = roleList.filter((r) => r.app_access);
      setRoles(assignable);
      if (!isEdit && assignable[0]) {
        setRole(assignable[0].id);
      }
    }

    void loadRoles();
  }, [open, isEdit]);

  useEffect(() => {
    if (!open) return;
    setFirstName(user?.first_name ?? '');
    setLastName(user?.last_name ?? '');
    setEmail(user?.email ?? '');
    setPassword('');
    setRole(user?.role ?? '');
    setStatus(user?.status ?? 'active');
    setError(null);
  }, [open, user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const saved = isEdit && user
        ? await updateUser(user.id, {
            first_name: firstName,
            last_name: lastName,
            email,
            role,
            status,
            ...(password ? { password } : {}),
          })
        : await createUser({
            first_name: firstName,
            last_name: lastName,
            email,
            password,
            role,
            status,
          });

      onSaved(saved);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, isEdit ? 'Failed to update user' : 'Failed to create user'));
    } finally {
      setIsSaving(false);
    }
  }

  const selectedRole = roles.find((r) => r.id === role);

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit ${user?.first_name ?? 'User'}` : 'Create User'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" form="user-form" disabled={isSaving} className="btn-primary">
            {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">First Name</label>
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jane"
              className="input"
            />
          </div>
          <div>
            <label className="label">Last Name</label>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label">Email Address</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
            className="input"
          />
        </div>

        <div>
          <label className="label">{isEdit ? 'New Password' : 'Password'}</label>
          <input
            required={!isEdit}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEdit ? 'Leave blank to keep current password' : '••••••••'}
            className="input"
          />
          {isEdit && (
            <p className="text-xs text-slate-400 mt-1.5">Leave blank to keep the current password.</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input" required>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {selectedRole && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
            {selectedRole.admin_access
              ? 'Administrator role with full system access.'
              : selectedRole.description || 'Standard CMS access based on assigned policies.'}
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
