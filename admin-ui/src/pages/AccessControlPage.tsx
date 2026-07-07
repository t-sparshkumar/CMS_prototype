import { useCallback, useEffect, useMemo, useState } from 'react';
import AppLayout from '../components/AppLayout';
import Icon from '../components/Icon';
import PolicyFormModal from '../components/PolicyFormModal';
import RoleFormModal from '../components/RoleFormModal';
import {
  deletePolicy,
  deleteRole,
  fetchPolicies,
  fetchRoles,
  setRolePolicies,
  type PolicyMeta,
  type RoleMeta,
} from '../lib/api';
import { getApiErrorMessage } from '../lib/apiErrors';

type Tab = 'roles' | 'policies';

function isSystemRole(role: RoleMeta): boolean {
  return role.admin_access || role.name === 'Public';
}

export default function AccessControlPage() {
  const [tab, setTab] = useState<Tab>('roles');
  const [roles, setRoles] = useState<RoleMeta[]>([]);
  const [policies, setPolicies] = useState<PolicyMeta[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [assignedPolicyIds, setAssignedPolicyIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPolicies, setIsSavingPolicies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [roleModal, setRoleModal] = useState<{ mode: 'create' } | { mode: 'edit'; role: RoleMeta } | null>(
    null,
  );
  const [policyModal, setPolicyModal] = useState<{ mode: 'create' } | { mode: 'edit'; policy: PolicyMeta } | null>(
    null,
  );
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [deletingPolicyId, setDeletingPolicyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [roleList, policyList] = await Promise.all([fetchRoles(), fetchPolicies()]);
      setRoles(roleList);
      setPolicies(policyList);
      setSelectedRoleId((prev) => prev || roleList[0]?.id || '');
    } catch {
      setError('Failed to load roles and policies');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  useEffect(() => {
    if (!selectedRole) {
      setAssignedPolicyIds([]);
      return;
    }
    setAssignedPolicyIds(selectedRole.policy_ids ?? []);
  }, [selectedRole]);

  const isDirty = useMemo(() => {
    if (!selectedRole) return false;
    const current = [...(selectedRole.policy_ids ?? [])].sort().join(',');
    const draft = [...assignedPolicyIds].sort().join(',');
    return current !== draft;
  }, [assignedPolicyIds, selectedRole]);

  function togglePolicyAssignment(policyId: string) {
    setAssignedPolicyIds((prev) =>
      prev.includes(policyId) ? prev.filter((id) => id !== policyId) : [...prev, policyId],
    );
  }

  async function handleSaveRolePolicies() {
    if (!selectedRole || selectedRole.admin_access) return;
    setIsSavingPolicies(true);
    setError(null);
    try {
      const saved = await setRolePolicies(selectedRole.id, assignedPolicyIds);
      setRoles((prev) =>
        prev.map((role) =>
          role.id === selectedRole.id
            ? { ...role, policy_ids: saved, policy_count: saved.length }
            : role,
        ),
      );
      setToast({ type: 'success', text: `Saved policies for ${selectedRole.name}` });
    } catch (err) {
      setToast({ type: 'error', text: getApiErrorMessage(err, 'Failed to save role policies') });
    } finally {
      setIsSavingPolicies(false);
    }
  }

  function handleRoleSaved(role: RoleMeta) {
    setRoles((prev) => {
      const exists = prev.some((r) => r.id === role.id);
      const next = exists
        ? prev.map((r) => (r.id === role.id ? { ...r, ...role } : r))
        : [...prev, { ...role, user_count: 0, policy_count: 0, policy_ids: [] }];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    setSelectedRoleId(role.id);
    setToast({ type: 'success', text: `Role "${role.name}" saved` });
  }

  function handlePolicySaved(policy: PolicyMeta) {
    setPolicies((prev) => {
      const exists = prev.some((p) => p.id === policy.id);
      if (exists) {
        return prev.map((p) => (p.id === policy.id ? policy : p));
      }
      return [...prev, policy].sort((a, b) => a.name.localeCompare(b.name));
    });
    setToast({ type: 'success', text: `Policy "${policy.name}" saved` });
  }

  async function handleDeleteRole(role: RoleMeta) {
    if (isSystemRole(role)) return;
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    setDeletingRoleId(role.id);
    try {
      await deleteRole(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      if (selectedRoleId === role.id) {
        setSelectedRoleId(roles.find((r) => r.id !== role.id)?.id ?? '');
      }
      setToast({ type: 'success', text: `Deleted role "${role.name}"` });
    } catch (err) {
      setToast({ type: 'error', text: getApiErrorMessage(err, 'Failed to delete role') });
    } finally {
      setDeletingRoleId(null);
    }
  }

  async function handleDeletePolicy(policy: PolicyMeta) {
    if (policy.is_system) return;
    if (!window.confirm(`Delete policy "${policy.name}"?`)) return;
    setDeletingPolicyId(policy.id);
    try {
      await deletePolicy(policy.id);
      setPolicies((prev) => prev.filter((p) => p.id !== policy.id));
      setAssignedPolicyIds((prev) => prev.filter((id) => id !== policy.id));
      setRoles((prev) =>
        prev.map((role) => ({
          ...role,
          policy_ids: (role.policy_ids ?? []).filter((id) => id !== policy.id),
          policy_count: (role.policy_ids ?? []).filter((id) => id !== policy.id).length,
        })),
      );
      setToast({ type: 'success', text: `Deleted policy "${policy.name}"` });
    } catch (err) {
      setToast({ type: 'error', text: getApiErrorMessage(err, 'Failed to delete policy') });
    } finally {
      setDeletingPolicyId(null);
    }
  }

  return (
    <AppLayout
      title="Roles & Policies"
      subtitle="Configure roles and assign policies to define permissions (Directus-style)"
      actions={
        tab === 'roles' ? (
          <button type="button" onClick={() => setRoleModal({ mode: 'create' })} className="btn-primary">
            <Icon name="plus" className="h-4 w-4" />
            Add Role
          </button>
        ) : (
          <button type="button" onClick={() => setPolicyModal({ mode: 'create' })} className="btn-primary">
            <Icon name="plus" className="h-4 w-4" />
            Add Policy
          </button>
        )
      }
    >
      <div className="max-w-6xl space-y-5">
        {toast && (
          <div className={toast.type === 'success' ? 'toast-success' : 'toast-error'} role="status">
            {toast.text}
          </div>
        )}

        <div className="tab-bar">
          <button
            type="button"
            onClick={() => setTab('roles')}
            className={tab === 'roles' ? 'tab-item-active' : 'tab-item'}
          >
            Roles Access Control
          </button>
          <button
            type="button"
            onClick={() => setTab('policies')}
            className={tab === 'policies' ? 'tab-item-active' : 'tab-item'}
          >
            Permissions Policies
          </button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {isLoading ? (
          <div className="card p-12 text-center text-slate-400">Loading...</div>
        ) : tab === 'roles' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {roles.map((role) => {
                const selected = selectedRoleId === role.id;
                return (
                  <div
                    key={role.id}
                    className={`card p-5 cursor-pointer transition-all ${
                      selected ? 'ring-2 ring-brand-500 border-brand-200' : 'hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedRoleId(role.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-bold text-slate-900 truncate">{role.name}</h3>
                          {isSystemRole(role) && <span className="badge-blue text-[10px]">System</span>}
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {role.description ?? 'No description'}
                        </p>
                      </div>
                      {!isSystemRole(role) && (
                        <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setRoleModal({ mode: 'edit', role })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                          >
                            <Icon name="edit" className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={deletingRoleId === role.id}
                            onClick={() => void handleDeleteRole(role)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
                      <span>
                        <strong className="text-slate-800">{role.user_count ?? 0}</strong> user
                        {(role.user_count ?? 0) === 1 ? '' : 's'}
                      </span>
                      <span>
                        <strong className="text-slate-800">{role.policy_count ?? 0}</strong> polic
                        {(role.policy_count ?? 0) === 1 ? 'y' : 'ies'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedRole && (
              <section className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Role Configuration & Policies</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select policies to grant permissions to this role
                    </p>
                  </div>
                  <span className="badge-blue">{selectedRole.name}</span>
                </div>

                {selectedRole.admin_access ? (
                  <div className="p-8 text-center">
                    <span className="h-12 w-12 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center mx-auto mb-3">
                      <Icon name="shield" className="h-6 w-6" />
                    </span>
                    <h3 className="font-bold text-slate-900">Administrator Access</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                      This role has full system access and bypasses all policy checks.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-slate-100">
                      {policies.map((policy) => {
                        const checked = assignedPolicyIds.includes(policy.id);
                        return (
                          <label
                            key={policy.id}
                            className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors ${
                              checked ? 'bg-brand-50/40' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => togglePolicyAssignment(policy.id)}
                              className="mt-1 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900">{policy.name}</span>
                                {policy.is_system && (
                                  <span className="badge-gray text-[10px]">System</span>
                                )}
                              </span>
                              <span className="block text-sm text-slate-500 mt-0.5">
                                {policy.description}
                              </span>
                              <span className="block text-xs text-slate-400 mt-1">
                                {policy.rules.length} rule{policy.rules.length === 1 ? '' : 's'} · assigned to{' '}
                                {policy.role_count} role{policy.role_count === 1 ? '' : 's'}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="px-5 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
                      <button
                        type="button"
                        disabled={!isDirty || isSavingPolicies}
                        onClick={() => void handleSaveRolePolicies()}
                        className="btn-primary disabled:opacity-50"
                      >
                        {isSavingPolicies ? 'Saving...' : 'Save Role Configuration'}
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {policies.map((policy) => (
              <div key={policy.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-slate-900">{policy.name}</h3>
                      {policy.is_system && <span className="badge-blue text-[10px]">System</span>}
                    </div>
                    <p className="text-sm text-slate-500">{policy.description}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPolicyModal({ mode: 'edit', policy })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                    >
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                    {!policy.is_system && (
                      <button
                        type="button"
                        disabled={deletingPolicyId === policy.id}
                        onClick={() => void handleDeletePolicy(policy)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Rules ({policy.rules.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {policy.rules.slice(0, 8).map((rule, index) => (
                      <span key={`${rule.collection}-${rule.action}-${index}`} className="badge-gray text-[11px]">
                        {rule.collection}:{rule.action}
                      </span>
                    ))}
                    {policy.rules.length > 8 && (
                      <span className="badge-gray text-[11px]">+{policy.rules.length - 8} more</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Assigned to {policy.role_count} role{policy.role_count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {roleModal && (
        <RoleFormModal
          open
          role={roleModal.mode === 'edit' ? roleModal.role : null}
          onClose={() => setRoleModal(null)}
          onSaved={handleRoleSaved}
        />
      )}

      {policyModal && (
        <PolicyFormModal
          open
          policy={policyModal.mode === 'edit' ? policyModal.policy : null}
          onClose={() => setPolicyModal(null)}
          onSaved={handlePolicySaved}
        />
      )}
    </AppLayout>
  );
}
