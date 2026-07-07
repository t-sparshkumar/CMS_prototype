import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import Icon from '../components/Icon';
import { fetchUsers, type UserListEntry } from '../lib/api';

function initials(first: string, last: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || 'U';
}

const AVATAR_GRADIENTS = [
  'from-brand-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setUsers(await fetchUsers());
      } catch {
        setError('Failed to load users');
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <AppLayout
      title="User Management"
      subtitle="Manage CMS users and their access levels"
      actions={
        <Link to="/settings/users/new" className="btn-primary">
          <Icon name="plus" className="h-4 w-4" />
          Add User
        </Link>
      }
    >
      <div className="max-w-5xl space-y-5">
        {error && <div className="alert-error">{error}</div>}

        <div className="page-toolbar">
          <span className="toolbar-count">
            {users.length} user{users.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="table-shell">
          <table className="w-full text-sm">
            <thead className="table-head">
              <tr>
                <th className="table-th">User</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.id} className="table-row-hover">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-9 w-9 rounded-full bg-gradient-to-br ${
                            AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
                          } text-white flex items-center justify-center text-xs font-bold shrink-0`}
                        >
                          {initials(user.first_name, user.last_name)}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {user.first_name} {user.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="table-td">{user.email}</td>
                    <td className="table-td">
                      <span className="badge-blue">{user.role_name ?? user.role}</span>
                    </td>
                    <td className="table-td">
                      <span className={user.status === 'active' ? 'badge-green' : 'badge-gray'}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
