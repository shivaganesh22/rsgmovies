import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HardDrive,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  RefreshCw,
  Zap,
  Star,
  Shield,
  Layers,
} from 'lucide-react';
import adminApi from '../../api/admin';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ErrorState from '../../components/ui/ErrorState';
import { toastSuccess, toastError, toastWarning } from '../../components/ui/Notifications';

export const AdminSeedr = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editModalAccount, setEditModalAccount] = useState(null);
  const [testResult, setTestResult] = useState(null); // { id, success, message }

  // Fetch Accounts
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminSeedrAccounts'],
    queryFn: () => adminApi.getSeedrAccounts(),
  });

  const accounts = Array.isArray(data) ? data : data?.results || [];

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (newAccount) => adminApi.createSeedrAccount(newAccount),
    onSuccess: () => {
      toastSuccess('Seedr account created successfully.');
      setIsAddModalOpen(false);
      queryClient.invalidateQueries(['adminSeedrAccounts']);
    },
    onError: (err) => {
      toastError(err.response?.data?.error?.message || 'Failed to create Seedr account.');
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateSeedrAccount(id, data),
    onSuccess: () => {
      toastSuccess('Seedr account updated.');
      setEditModalAccount(null);
      queryClient.invalidateQueries(['adminSeedrAccounts']);
    },
    onError: (err) => {
      toastError(err.response?.data?.error?.message || 'Failed to update Seedr account.');
    },
  });

  // Set Default Mutation
  const setDefaultMutation = useMutation({
    mutationFn: (id) => adminApi.setDefaultSeedrAccount(id),
    onSuccess: (updated) => {
      toastSuccess(`"${updated.name}" is now the default Seedr account for new users.`);
      queryClient.invalidateQueries(['adminSeedrAccounts']);
    },
    onError: (err) => {
      toastError(err.response?.data?.error?.message || 'Failed to set default account.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteSeedrAccount(id),
    onSuccess: () => {
      toastSuccess('Seedr account removed.');
      queryClient.invalidateQueries(['adminSeedrAccounts']);
    },
    onError: (err) => {
      toastError(err.response?.data?.error?.message || 'Failed to delete Seedr account.');
    },
  });

  // Test Connection Mutation
  const testMutation = useMutation({
    mutationFn: (id) => adminApi.testSeedrAccount(id),
    onSuccess: (res, id) => {
      if (res?.connected || res?.success || res?.status === 'OK') {
        toastSuccess('Seedr live connection verified successfully!');
        setTestResult({ id, success: true, message: 'Connected to Seedr API' });
      } else {
        toastWarning(res?.error || 'Connection failed.');
        setTestResult({ id, success: false, message: res?.error || 'Connection failed' });
      }
    },
    onError: (err, id) => {
      const msg = err.response?.data?.error?.message || 'Connection test error';
      toastError(msg);
      setTestResult({ id, success: false, message: msg });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HardDrive size={18} className="text-blue-400" />
            <span>Seedr Account Management Suite</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage encrypted Seedr storage accounts, designate system defaults, and assign accounts to users.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus size={14} />}
          >
            Add Seedr Account
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {isError ? (
        <ErrorState onRetry={refetch} message="Could not load Seedr accounts." />
      ) : (
        <div className="rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-surface-elevated text-gray-400 font-bold uppercase tracking-wider text-[11px] border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Account Name</th>
                  <th className="px-6 py-4">Username / Email</th>
                  <th className="px-6 py-4">Default Status</th>
                  <th className="px-6 py-4">Assigned Users</th>
                  <th className="px-6 py-4">Live Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-4 h-14 bg-white/5" />
                    </tr>
                  ))
                ) : accounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No Seedr accounts registered in the system.
                    </td>
                  </tr>
                ) : (
                  accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4 text-white font-semibold flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                          <HardDrive size={16} />
                        </div>
                        <div>
                          <span className="block font-bold">{acc.name}</span>
                          {acc.package_name && (
                            <span className="text-[10px] text-gray-400">{acc.package_name}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-gray-300">
                        {acc.username || acc.email || 'N/A'}
                      </td>

                      <td className="px-6 py-4">
                        {acc.is_default ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold text-[11px]">
                            <Star size={12} className="fill-current" /> Default Account
                          </span>
                        ) : (
                          <button
                            onClick={() => setDefaultMutation.mutate(acc.id)}
                            disabled={setDefaultMutation.isPending}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-elevated hover:bg-white/10 text-gray-400 hover:text-amber-400 border border-gray-700 text-[11px] transition"
                            title="Set this account as default for new users"
                          >
                            <Star size={11} /> Make Default
                          </button>
                        )}
                      </td>

                      <td className="px-6 py-4 text-gray-400">
                        <span className="px-2 py-0.5 rounded-md bg-surface-elevated text-gray-300 font-semibold border border-white/5">
                          {acc.user_count ?? acc.assigned_users_count ?? 0} user(s)
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {testResult?.id === acc.id ? (
                          testResult.success ? (
                            <span className="text-green-400 text-xs flex items-center gap-1 font-bold">
                              <CheckCircle2 size={14} /> Connected
                            </span>
                          ) : (
                            <span className="text-red-400 text-xs flex items-center gap-1 font-bold">
                              <AlertCircle size={14} /> Failed
                            </span>
                          )
                        ) : acc.status === 'ACTIVE' ? (
                          <span className="text-green-400 text-xs flex items-center gap-1">
                            <CheckCircle2 size={14} /> Active
                          </span>
                        ) : (
                          <span className="text-amber-400 text-xs flex items-center gap-1">
                            <AlertCircle size={14} /> {acc.status || 'Requires Reauth'}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => testMutation.mutate(acc.id)}
                            isLoading={testMutation.isPending && testMutation.variables === acc.id}
                            icon={<Zap size={13} className="text-amber-400" />}
                          >
                            Test Live
                          </Button>
                          <button
                            onClick={() => setEditModalAccount(acc)}
                            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white transition border border-gray-700"
                            title="Edit Account"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete Seedr account "${acc.name}"? Users assigned to this account will be unassigned.`)) {
                                deleteMutation.mutate(acc.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition"
                            title="Delete Account"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Seedr Account"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            createMutation.mutate({
              name: fd.get('name'),
              username: fd.get('username'),
              password: fd.get('password'),
              is_default: fd.get('is_default') === 'true',
            });
          }}
          className="space-y-4"
        >
          <Input label="Account Name" name="name" placeholder="e.g. Primary Pool 1" required />
          <Input
            label="Seedr Username or Email"
            name="username"
            type="email"
            placeholder="user@example.com"
            required
          />
          <Input
            label="Seedr Password"
            name="password"
            type="password"
            placeholder="••••••••••••"
            required
          />

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="add_is_default"
              name="is_default"
              value="true"
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-surface border-gray-700"
            />
            <label htmlFor="add_is_default" className="text-xs text-gray-300">
              Set as Default account for new user profiles
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
            <Button variant="secondary" size="md" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={createMutation.isPending}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Account Modal */}
      {editModalAccount && (
        <Modal
          isOpen={Boolean(editModalAccount)}
          onClose={() => setEditModalAccount(null)}
          title={`Edit Account: ${editModalAccount.name}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              const payload = {
                name: fd.get('name'),
                username: fd.get('username'),
                is_default: fd.get('is_default') === 'true',
              };
              const pwd = fd.get('password');
              if (pwd) payload.password = pwd;
              updateMutation.mutate({ id: editModalAccount.id, data: payload });
            }}
            className="space-y-4"
          >
            <Input
              label="Account Name"
              name="name"
              defaultValue={editModalAccount.name}
              required
            />
            <Input
              label="Seedr Username or Email"
              name="username"
              type="email"
              defaultValue={editModalAccount.username || editModalAccount.email}
              required
            />
            <Input
              label="New Password (leave blank to keep existing)"
              name="password"
              type="password"
              placeholder="••••••••••••"
            />

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="edit_is_default"
                name="is_default"
                value="true"
                defaultChecked={editModalAccount.is_default}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-surface border-gray-700"
              />
              <label htmlFor="edit_is_default" className="text-xs text-gray-300">
                Set as Default account for new user profiles
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <Button variant="secondary" size="md" type="button" onClick={() => setEditModalAccount(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" isLoading={updateMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminSeedr;
