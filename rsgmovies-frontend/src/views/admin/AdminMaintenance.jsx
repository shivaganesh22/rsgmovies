import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ShieldCheck, Save, RefreshCw } from 'lucide-react';
import adminApi from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import { toastSuccess, toastError } from '../../components/ui/Notifications';

export const AdminMaintenance = () => {
  const queryClient = useQueryClient();
  const { setIsMaintenance } = useAuth();

  const [isEnabled, setIsEnabled] = useState(false);
  const [message, setMessage] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminMaintenance'],
    queryFn: () => adminApi.getMaintenance(),
  });

  useEffect(() => {
    if (data) {
      setIsEnabled(Boolean(data.is_enabled || data.enabled || data.active));
      setMessage(data.message || 'RSG Movies is currently undergoing scheduled maintenance.');
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload) => adminApi.updateMaintenance(payload),
    onSuccess: (res) => {
      toastSuccess('Maintenance mode settings updated.');
      setIsMaintenance(isEnabled);
      queryClient.invalidateQueries(['adminMaintenance']);
    },
    onError: (err) => {
      toastError(err.response?.data?.error?.message || 'Failed to update maintenance mode.');
    },
  });

  const handleSave = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      is_enabled: isEnabled,
      message: message.trim(),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle size={20} className="text-amber-400" />
            Maintenance Mode Control
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            When enabled, all non-admin traffic receives an HTTP 503 Maintenance response with your custom message. Administrators bypass maintenance automatically.
          </p>
        </div>

        {isError ? (
          <ErrorState onRetry={refetch} message="Could not fetch maintenance status." />
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-elevated border border-white/5">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-white">Maintenance Mode</span>
                <p className="text-xs text-gray-400">
                  {isEnabled ? 'ACTIVE (Blocking non-admin users)' : 'DISABLED (Normal operations)'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEnabled(!isEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEnabled ? 'bg-amber-500' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Custom Message Textarea */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                User-Facing Maintenance Notice
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain the scheduled maintenance to users..."
                className="w-full bg-surface border border-gray-700 text-white text-sm rounded-xl p-3.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-gray-500 transition"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                type="submit"
                isLoading={updateMutation.isPending}
                icon={<Save size={16} />}
              >
                Save Settings
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminMaintenance;
