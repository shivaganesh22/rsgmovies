import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  LogOut,
  RefreshCw,
  Edit2,
  HardDrive,
} from 'lucide-react';
import adminApi from '../../api/admin';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ErrorState from '../../components/ui/ErrorState';
import { toastSuccess, toastError } from '../../components/ui/Notifications';

export const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editUserModal, setEditUserModal] = useState(null); // user object

  // Fetch Users
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminUsers', searchTerm, roleFilter, page],
    queryFn: () => adminApi.getUsers({ search: searchTerm, role: roleFilter, page }),
  });

  // Fetch Seedr Accounts for Assignment Dropdown
  const { data: seedrAccountsData } = useQuery({
    queryKey: ['adminSeedrAccountsList'],
    queryFn: () => adminApi.getSeedrAccounts(),
  });

  const seedrAccounts = Array.isArray(seedrAccountsData)
    ? seedrAccountsData
    : seedrAccountsData?.results || [];

  // Revoke Session Mutation
  const revokeSessionMutation = useMutation({
    mutationFn: (userId) => adminApi.revokeSession(userId),
    onSuccess: () => {
      toastSuccess('User session revoked successfully.');
      queryClient.invalidateQueries(['adminUsers']);
    },
    onError: (err) => {
      toastError(err.response?.data?.error?.message || 'Failed to revoke session.');
    },
  });

  // Update User Mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      toastSuccess('User profile updated successfully.');
      setEditUserModal(null);
      queryClient.invalidateQueries(['adminUsers']);
    },
    onError: (err) => {
      toastError(err.response?.data?.error?.message || 'Failed to update user.');
    },
  });

  const usersList = Array.isArray(data) ? data : data?.results || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-white/5">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="max-w-xs w-full">
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, UPN, email..."
              icon={<Search size={14} />}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="bg-surface-elevated text-xs font-semibold text-white rounded-xl border border-gray-700 px-3 py-2.5 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => refetch()}
          icon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
        >
          Refresh
        </Button>
      </div>

      {/* Users Table */}
      {isError ? (
        <ErrorState onRetry={refetch} message="Could not load users list from admin backend." />
      ) : (
        <div className="rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-surface-elevated text-gray-400 font-bold uppercase tracking-wider text-[11px] border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">UPN / Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Assigned Seedr</th>
                  <th className="px-6 py-4">Active Session</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="px-6 py-4 h-14 bg-white/5" />
                    </tr>
                  ))
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  usersList.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4 text-white font-semibold flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 font-bold flex items-center justify-center text-sm border border-blue-500/30">
                          {user.display_name?.charAt(0) || 'U'}
                        </div>
                        <span>{user.display_name || 'N/A'}</span>
                      </td>

                      <td className="px-6 py-4 text-gray-300">
                        <div>{user.upn}</div>
                        {user.email && user.email !== user.upn && (
                          <div className="text-[11px] text-gray-500">{user.email}</div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            user.role === 'Admin'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                          }`}
                        >
                          {user.role || 'User'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-gray-400">
                        {user.seedr_account_name || user.seedr_account?.name || (
                          <span className="text-gray-600 italic">None</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {user.has_active_session ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[11px]">Idle</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {user.is_active !== false ? (
                          <span className="text-green-400 text-xs flex items-center gap-1">
                            <UserCheck size={14} /> Active
                          </span>
                        ) : (
                          <span className="text-red-400 text-xs flex items-center gap-1">
                            <UserX size={14} /> Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditUserModal(user)}
                            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white transition border border-gray-700"
                            title="Edit User"
                          >
                            <Edit2 size={14} />
                          </button>

                          {user.has_active_session && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => revokeSessionMutation.mutate(user.id)}
                              isLoading={revokeSessionMutation.isPending}
                              icon={<LogOut size={13} />}
                            >
                              Revoke
                            </Button>
                          )}
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

      {/* Edit User Modal */}
      {editUserModal && (
        <Modal
          isOpen={Boolean(editUserModal)}
          onClose={() => setEditUserModal(null)}
          title={`Edit User: ${editUserModal.display_name || editUserModal.upn}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              updateUserMutation.mutate({
                id: editUserModal.id,
                data: {
                  role: fd.get('role'),
                  seedr_account: fd.get('seedr_account') || null,
                  is_active: fd.get('is_active') === 'true',
                },
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">User Role</label>
              <select
                name="role"
                defaultValue={editUserModal.role || 'User'}
                className="w-full bg-surface border border-gray-700 text-white text-sm rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
              >
                <option value="User">User</option>
                <option value="Admin">Admin (Full Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Assign Seedr Account
              </label>
              <select
                name="seedr_account"
                defaultValue={editUserModal.seedr_account?.id || editUserModal.seedr_account || ''}
                className="w-full bg-surface border border-gray-700 text-white text-sm rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
              >
                <option value="">None (Unassigned)</option>
                {seedrAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.email || acc.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">Account Status</label>
              <select
                name="is_active"
                defaultValue={editUserModal.is_active !== false ? 'true' : 'false'}
                className="w-full bg-surface border border-gray-700 text-white text-sm rounded-xl p-2.5 focus:outline-none focus:border-blue-500"
              >
                <option value="true">Active (Allowed to sign in)</option>
                <option value="false">Inactive / Suspended</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <Button variant="secondary" size="md" type="button" onClick={() => setEditUserModal(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={updateUserMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminUsers;
