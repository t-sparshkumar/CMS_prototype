import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ConfirmDialog from '../components/data-model/ConfirmDialog';
import Icon from '../components/Icon';
import UserFormModal from '../components/UserFormModal';
import {
  deleteUser,
  fetchRoles,
  fetchUsers,
  type RoleMeta,
  type UserListEntry,
} from '../lib/api';
import { getApiErrorMessage } from '../lib/apiErrors';
import { useAuthStore } from '../stores/authStore';

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
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = Boolean(currentUser?.admin_access);

  const [users, setUsers] = useState<UserListEntry[]>([]);
  const [roles, setRoles] = useState<RoleMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userModal, setUserModal] = useState<{ mode: 'create' } | { mode: 'edit'; user: UserListEntry } | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<UserListEntry | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const adminRoleIds = useMemo(
    () => new Set(roles.filter((role) => role.admin_access).map((role) => role.id)),
    [roles],
  );

  const adminUserCount = useMemo(
    () => users.filter((user) => adminRoleIds.has(user.role)).length,
    [adminRoleIds, users],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [userList, roleList] = await Promise.all([fetchUsers(), fetchRoles()]);
      setUsers(userList);
      setRoles(roleList);
    } catch {
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadData();
  }, [isAdmin, loadData]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function handleUserSaved(user: UserListEntry) {
    setUsers((prev) => {
      const exists = prev.some((entry) => entry.id === user.id);
      if (exists) {
        return prev.map((entry) => (entry.id === user.id ? user : entry));
      }
      return [...prev, user].sort((a, b) => a.first_name.localeCompare(b.first_name));
    });
    setToast({
      type: 'success',
      text: userModal?.mode === 'edit' ? `Updated ${user.first_name} ${user.last_name}` : `Created ${user.email}`,
    });
  }

  function canDeleteUser(user: UserListEntry): boolean {
    if (user.id === currentUser?.id) return false;
    if (adminRoleIds.has(user.role) && adminUserCount <= 1) return false;
    return true;
  }

  function deleteDisabledReason(user: UserListEntry): string | null {
    if (user.id === currentUser?.id) return 'You cannot delete your own account';
    if (adminRoleIds.has(user.role) && adminUserCount <= 1) return 'Cannot delete the last administrator';
    return null;
  }

  async function handleDeleteUser(user: UserListEntry) {
    setDeletingUserId(user.id);
    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((entry) => entry.id !== user.id));
      setToast({ type: 'success', text: `Deleted ${user.first_name} ${user.last_name}` });
    } catch (err) {
      setToast({ type: 'error', text: getApiErrorMessage(err, 'Failed to delete user') });
    } finally {
      setDeletingUserId(null);
    }
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <AppLayout
      title="User Management"
      subtitle="Manage CMS users and their access levels"
      actions={
        <button type="button" onClick={() => setUserModal({ mode: 'create' })} className="btn-primary">
          <Icon name="plus" className="h-4 w-4" />
          Add User
        </button>
      }
    >
      <div className="max-w-5xl space-y-5">
        {toast && (
          <div className={toast.type === 'success' ? 'toast-success' : 'toast-error'} role="status">
            {toast.text}
          </div>
        )}

        {error && <div className="alert-error">{error}</div>}

        <div className="page-toolbar">
          <span className="toolbar-count">
            {users.length} user{users.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="table-shell">
          <div className="table-scroll">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="table-head">
              <tr>
                <th className="table-th">User</th>
                <th className="table-th hidden md:table-cell">Email</th>
                <th className="table-th hidden sm:table-cell">Role</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state py-12">
                      <span className="empty-state-icon">
                        <Icon name="users" className="h-7 w-7" />
                      </span>
                      <p className="text-slate-500">No users found.</p>
                      <button
                        type="button"
                        onClick={() => setUserModal({ mode: 'create' })}
                        className="btn-primary mt-4"
                      >
                        <Icon name="plus" className="h-4 w-4" />
                        Add User
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user, index) => {
                  const deleteReason = deleteDisabledReason(user);
                  const isDeleting = deletingUserId === user.id;

                  return (
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
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900">
                              {user.first_name} {user.last_name}
                              {user.id === currentUser?.id && (
                                <span className="ml-2 text-xs font-medium text-slate-400">(you)</span>
                              )}
                            </span>
                            <p className="truncate text-xs text-slate-500 md:hidden">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td hidden md:table-cell">{user.email}</td>
                      <td className="table-td hidden sm:table-cell">
                        <span className="badge-blue">{user.role_name ?? user.role}</span>
                      </td>
                      <td className="table-td">
                        <span className={user.status === 'active' ? 'badge-green' : 'badge-gray'}>
                          {user.status}
                        </span>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setUserModal({ mode: 'edit', user })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                            aria-label={`Edit ${user.first_name} ${user.last_name}`}
                          >
                            <Icon name="edit" className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(user)}
                            disabled={!canDeleteUser(user) || isDeleting}
                            title={deleteReason ?? 'Delete user'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            aria-label={`Delete ${user.first_name} ${user.last_name}`}
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      {userModal && (
        <UserFormModal
          open
          user={userModal.mode === 'edit' ? userModal.user : null}
          onClose={() => setUserModal(null)}
          onSaved={handleUserSaved}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user"
        message={`Delete ${deleteTarget?.first_name} ${deleteTarget?.last_name} (${deleteTarget?.email})? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!deleteTarget) return;
          void handleDeleteUser(deleteTarget).finally(() => setDeleteTarget(null));
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
