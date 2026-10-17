import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Search,
  RefreshCw,
  Eye,
  Sliders,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import adminApi from '../../api/admin';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import ErrorState from '../../components/ui/ErrorState';

export const AdminActivity = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState('');
  const [viewMetadata, setViewMetadata] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Fetch Activity Logs
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['adminActivityLogs', search, eventType],
    queryFn: () => adminApi.getActivityLogs({ search, event_type: eventType, limit: 300 }),
  });

  // Fetch Capture Settings
  const { data: logSettings } = useQuery({
    queryKey: ['adminActivityLogSettings'],
    queryFn: () => adminApi.getActivityLogSettings(),
  });

  // Mutation to update Capture Settings
  const settingsMutation = useMutation({
    mutationFn: (newSettings) => adminApi.updateActivityLogSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminActivityLogSettings'] });
      setActionSuccess('Log capture settings updated successfully.');
      setTimeout(() => setActionSuccess(''), 4000);
      setIsSettingsOpen(false);
    },
  });

  // Mutation to clear all logs
  const clearMutation = useMutation({
    mutationFn: () => adminApi.clearActivityLogs(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['adminActivityLogs'] });
      setIsClearModalOpen(false);
      setActionSuccess(res?.detail || 'All activity logs deleted successfully.');
      setTimeout(() => setActionSuccess(''), 4000);
    },
  });

  const logs = Array.isArray(data) ? data : data?.results || [];

  const getEventBadge = (type) => {
    if (type?.includes('LOGIN_SUCCESS') || type?.includes('SUCCESS') || type?.includes('CREATED')) {
      return 'bg-green-500/10 text-green-400 border-green-500/30';
    }
    if (type?.includes('REVOKE') || type?.includes('FAIL') || type?.includes('DENIED') || type?.includes('ERROR')) {
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
    if (type?.includes('MAINTENANCE') || type?.includes('WARN') || type?.includes('CHANGED')) {
      return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    }
    if (type?.includes('STREAM') || type?.includes('VIEW')) {
      return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
    }
    return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
  };

  const handleToggleSetting = (categoryKey, currentValue) => {
    if (!logSettings) return;
    settingsMutation.mutate({
      [categoryKey]: !currentValue,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alert notification */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Search, Filter & Action Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 glass-panel p-4 rounded-2xl border border-white/5">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1 max-w-sm">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by UPN, IP, Request ID..."
              icon={<Search size={14} />}
            />
          </div>

          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="bg-surface-elevated text-xs font-semibold text-white rounded-xl border border-gray-700 px-3 py-2.5 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Event Types ({logs.length})</option>
            <optgroup label="Authentication & Sessions">
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="SESSION_CREATED">SESSION_CREATED</option>
              <option value="SESSION_EXPIRED">SESSION_EXPIRED</option>
              <option value="SESSION_REVOKED">SESSION_REVOKED</option>
              <option value="ACCESS_DENIED">ACCESS_DENIED</option>
            </optgroup>
            <optgroup label="Seedr Operations">
              <option value="SEEDR_OP_SUCCESS">SEEDR_OP_SUCCESS</option>
              <option value="SEEDR_OP_ERROR">SEEDR_OP_ERROR</option>
              <option value="SEEDR_AUTH_ERROR">SEEDR_AUTH_ERROR</option>
              <option value="FILE_ACCESSED">FILE_ACCESSED</option>
              <option value="STREAM_STARTED">STREAM_STARTED</option>
            </optgroup>
            <optgroup label="Media & Discovery">
              <option value="MOVIE_VIEWED">MOVIE_VIEWED</option>
              <option value="MOVIE_SEARCHED">MOVIE_SEARCHED</option>
            </optgroup>
            <optgroup label="Administration & Maintenance">
              <option value="ROLE_CHANGED">ROLE_CHANGED</option>
              <option value="ACCOUNT_CHANGED">ACCOUNT_CHANGED</option>
              <option value="MAINTENANCE_ENABLED">MAINTENANCE_ENABLED</option>
              <option value="MAINTENANCE_DISABLED">MAINTENANCE_DISABLED</option>
              <option value="SEEDR_CREDENTIALS_UPDATED">SEEDR_CREDENTIALS_UPDATED</option>
            </optgroup>
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Capture Settings Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsSettingsOpen(true)}
            icon={<Sliders size={14} />}
          >
            Capture Settings
          </Button>

          {/* Clear All Logs Button */}
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsClearModalOpen(true)}
            icon={<Trash2 size={14} />}
          >
            Clear Logs
          </Button>

          {/* Refresh Button */}
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

      {/* Table */}
      {isError ? (
        <ErrorState onRetry={refetch} message="Could not load activity logs." />
      ) : (
        <div className="rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-surface-elevated text-gray-400 font-bold uppercase tracking-wider text-[11px] border-b border-white/10">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Event Type</th>
                  <th className="px-5 py-3.5">User (UPN)</th>
                  <th className="px-5 py-3.5">IP Address</th>
                  <th className="px-5 py-3.5">Target Resource</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-5 py-4 h-12 bg-white/5" />
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                      No activity events recorded.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition">
                      <td className="px-5 py-3 text-gray-400 font-mono text-[11px] whitespace-nowrap">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>

                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getEventBadge(
                            log.event_type
                          )}`}
                        >
                          {log.event_type}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-white font-semibold">{log.upn || 'Anonymous'}</td>

                      <td className="px-5 py-3 text-gray-400 font-mono text-[11px]">
                        {log.ip_address || '-'}
                      </td>

                      <td className="px-5 py-3 text-gray-300 text-[11px] max-w-[240px]">
                        {(() => {
                          const metaTitle = log.metadata?.title || log.metadata?.name || log.metadata?.file_name || log.metadata?.movie_title || log.metadata?.query || '';
                          if (metaTitle) {
                            return (
                              <div className="truncate" title={`${metaTitle} (${log.resource_type || ''}: ${log.resource_id || ''})`}>
                                <span className="font-bold text-white block truncate">{metaTitle}</span>
                                {log.resource_type && (
                                  <span className="text-[10px] text-gray-400 font-mono block truncate">
                                    {log.resource_type} {log.resource_id ? `(${log.resource_id})` : ''}
                                  </span>
                                )}
                              </div>
                            );
                          }
                          return (
                            <span className="font-mono truncate block text-gray-400" title={log.resource_type ? `${log.resource_type} (${log.resource_id || ''})` : log.endpoint || '-'}>
                              {log.resource_type ? `${log.resource_type} (${log.resource_id || ''})` : log.endpoint || '-'}
                            </span>
                          );
                        })()}
                      </td>

                      <td className="px-5 py-3 text-right">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <button
                            onClick={() => setViewMetadata(log)}
                            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white transition border border-gray-700"
                            title="View Event Details"
                          >
                            <Eye size={13} />
                          </button>
                        ) : (
                          <span className="text-gray-600 text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Capture Settings Modal */}
      {isSettingsOpen && (
        <Modal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          title="Audit Log Storage & Capture Settings"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-400 leading-relaxed">
              Enable or disable specific event categories from being recorded to database storage. Disabling high-volume logs helps preserve storage quota.
            </p>

            {logSettings && (
              <div className="space-y-3 pt-2">
                {/* 1. Auth & Sessions */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white">Authentication & Sessions</h4>
                    <p className="text-[11px] text-gray-400">Login, logout, session creation, revocation & access denial</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(logSettings.auth_events)}
                    onChange={() => handleToggleSetting('auth_events', logSettings.auth_events)}
                    className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* 2. Seedr File Operations */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white">Seedr File Operations</h4>
                    <p className="text-[11px] text-gray-400">Torrent additions, deletions, archive downloads & folder locks</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(logSettings.seedr_events)}
                    onChange={() => handleToggleSetting('seedr_events', logSettings.seedr_events)}
                    className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* 3. Video Streams */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white">Video Stream Playback</h4>
                    <p className="text-[11px] text-gray-400">Tracks when users initiate video and file playback streams</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(logSettings.stream_events)}
                    onChange={() => handleToggleSetting('stream_events', logSettings.stream_events)}
                    className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* 4. Media Views & Searches */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white">Media Views & Searches</h4>
                    <p className="text-[11px] text-gray-400">High-volume movie and series details views & catalog search queries</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(logSettings.media_events)}
                    onChange={() => handleToggleSetting('media_events', logSettings.media_events)}
                    className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
                  />
                </div>

                {/* 5. Administration */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-surface border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white">Admin Management Actions</h4>
                    <p className="text-[11px] text-gray-400">User role modifications, Seedr account reassignments & maintenance toggles</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(logSettings.admin_events)}
                    onChange={() => handleToggleSetting('admin_events', logSettings.admin_events)}
                    className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-white/10">
              <Button variant="secondary" size="sm" onClick={() => setIsSettingsOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Clear All Logs Modal */}
      {isClearModalOpen && (
        <Modal
          isOpen={isClearModalOpen}
          onClose={() => setIsClearModalOpen(false)}
          title="Clear All Activity Logs"
        >
          <div className="space-y-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300 leading-relaxed">
                This will permanently delete all recorded activity and security audit events from the database. This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <Button variant="ghost" size="sm" onClick={() => setIsClearModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={clearMutation.isPending}
                onClick={() => clearMutation.mutate()}
              >
                Confirm Delete All Logs
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Metadata Detail Payload Modal */}
      {viewMetadata && (
        <Modal
          isOpen={Boolean(viewMetadata)}
          onClose={() => setViewMetadata(null)}
          title={`Event Details: ${viewMetadata.event_type}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-surface border border-white/5">
                <span className="text-gray-500 block text-[10px]">User (UPN)</span>
                <span className="text-white font-semibold">{viewMetadata.upn || 'Anonymous'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-white/5">
                <span className="text-gray-500 block text-[10px]">IP Address</span>
                <span className="text-white font-mono">{viewMetadata.ip_address || 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-white/5">
                <span className="text-gray-500 block text-[10px]">Request ID</span>
                <span className="text-white font-mono truncate block">{viewMetadata.request_id || 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface border border-white/5">
                <span className="text-gray-500 block text-[10px]">Timestamp</span>
                <span className="text-white font-mono">{new Date(viewMetadata.timestamp).toLocaleString()}</span>
              </div>
            </div>

            {viewMetadata.metadata && Object.keys(viewMetadata.metadata).length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-gray-300">Sanitized Event Payload:</h4>
                <pre className="p-3 bg-black/60 rounded-xl text-[11px] font-mono text-blue-300 border border-white/10 overflow-x-auto max-h-56">
                  {JSON.stringify(viewMetadata.metadata, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-white/10">
              <Button variant="secondary" size="sm" onClick={() => setViewMetadata(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminActivity;
