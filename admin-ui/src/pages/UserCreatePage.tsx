import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import Icon from '../components/Icon';
import { createUser, fetchRoles, type RoleMeta } from '../lib/api';

export default function UserCreatePage() {
  const navigate = useNavigate();
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
    async function load() {
      const roleList = await fetchRoles();
      const assignable = roleList.filter((r) => r.app_access);
      setRoles(assignable);
      if (assignable[0]) {
        setRole(assignable[0].id);
      }
    }
    void load();
  }, []);

  const selectedRole = roles.find((r) => r.id === role);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await createUser({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        role,
        status,
      });
      navigate('/settings/users');
    } catch {
      setError('Failed to create user');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppLayout title="Create New User" subtitle="Add a new member to your CMS workspace">
      <div className="max-w-4xl">
        <Link
          to="/settings/users"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 mb-5"
        >
          <Icon name="chevron-right" className="h-4 w-4 rotate-180" />
          Back to Users
        </Link>

        <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 card p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-5">User Details</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

            <div className="mb-4">
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

            <div className="mb-4">
              <label className="label">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
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

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-slate-100">
              <Link to="/settings/users" className="btn-secondary">
                Cancel
              </Link>
              <button type="submit" disabled={isSaving} className="btn-primary">
                {isSaving ? 'Saving...' : 'Save User'}
              </button>
            </div>
          </div>

          <div className="card p-6 h-fit">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Role Info</h2>
            {selectedRole ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center">
                    <Icon name="shield" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">{selectedRole.name}</p>
                    <p className="text-xs text-slate-400">
                      {selectedRole.admin_access ? 'Administrator' : 'Standard access'}
                    </p>
                  </div>
                </div>
                {selectedRole.description && (
                  <p className="text-sm text-slate-500">{selectedRole.description}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedRole.admin_access && <span className="badge-blue">Full admin</span>}
                  {selectedRole.app_access && <span className="badge-green">App access</span>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Select a role to see its permissions.</p>
            )}
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
