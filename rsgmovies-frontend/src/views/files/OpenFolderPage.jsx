import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Folder,
  File,
  Film,
  Trash2,
  Edit2,
  Play,
  ArrowLeft,
  RefreshCw,
  Download,
  Copy,
  Check,
  LayoutGrid,
  List,
  Archive,
} from 'lucide-react';
import seedrApi from '../../api/seedr';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ErrorState from '../../components/ui/ErrorState';
import { toastSuccess, toastWarning, toastError } from '../../components/ui/Notifications';
import { formatDateTimeIST } from '../../utils/media';

export const OpenFolderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('rsg_files_view_mode') || 'grid';
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('rsg_files_view_mode', mode);
  };
  const [copiedId, setCopiedId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['seedrFolder', id],
    queryFn: () => seedrApi.openFolder(id),
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: 10000,
  });

  const files = data?.files || [];
  const subfolders = data?.folders || [];
  const folderName = data?.name || 'Folder';

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ type, id: targetId }) => {
      if (type === 'file') return seedrApi.deleteFile(targetId);
      if (type === 'folder') return seedrApi.deleteFolder(targetId);
    },
    onSuccess: () => {
      toastSuccess('Item deleted.');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['seedrFolder', id] });
      queryClient.invalidateQueries({ queryKey: ['seedrFiles'] });
    },
    onError: () => toastError('Error deleting item.'),
  });

  // Rename Mutation
  const renameMutation = useMutation({
    mutationFn: async ({ type, id: targetId, name }) => {
      if (type === 'file') return seedrApi.renameFile(targetId, name);
      if (type === 'folder') return seedrApi.renameFolder(targetId, name);
    },
    onSuccess: () => {
      toastSuccess('Item renamed.');
      setRenameTarget(null);
      setRenameInput('');
      queryClient.invalidateQueries({ queryKey: ['seedrFolder', id] });
      queryClient.invalidateQueries({ queryKey: ['seedrFiles'] });
    },
    onError: () => toastError('Error renaming item.'),
  });

  // Archive Mutation: copy link to clipboard directly
  const archiveMutation = useMutation({
    mutationFn: (folderId) => seedrApi.folderArchive(folderId),
    onSuccess: (res) => {
      const url = res?.archive_url || res?.url;
      if (url) {
        navigator.clipboard.writeText(url).then(() => {
          toastSuccess('ZIP archive link copied to clipboard!');
        }).catch(() => {
          toastSuccess('Archive created successfully.');
        });
      } else {
        toastSuccess('Archive requested successfully.');
      }
    },
    onError: () => toastError('Failed to create folder archive.'),
  });

  // Direct File Download Handler
  const handleDownloadFile = async (fileId) => {
    try {
      const res = await seedrApi.getFile(fileId);
      const url = res?.url || res?.link;
      if (url) {
        window.open(url, '_blank');
        toastSuccess('Download started in new tab.');
      } else {
        toastWarning('Could not resolve download URL.');
      }
    } catch (e) {
      toastError('Failed to fetch file download URL.');
    }
  };

  // Copy Link Handler
  const handleCopyLink = async (fileId) => {
    try {
      const res = await seedrApi.getFile(fileId);
      const url = res?.url || res?.link;
      if (url) {
        await navigator.clipboard.writeText(url);
        setCopiedId(fileId);
        toastSuccess('Download link copied to clipboard!');
        setTimeout(() => setCopiedId(null), 2500);
      } else {
        toastWarning('Could not copy link.');
      }
    } catch (e) {
      toastError('Failed to copy file link.');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-3xl border border-white/10 shadow-xl bg-surface">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/files')}
            className="p-2 rounded-xl bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white transition border border-white/5"
            title="Back to Files"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Link to="/files" className="hover:text-white transition">Root Files</Link>
              <span>/</span>
              <span className="text-white font-medium">{folderName}</span>
            </div>
            <h1 className="text-xl font-bold font-display text-white mt-0.5">
              {folderName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-gray-700">
            <button
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => handleSetViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => archiveMutation.mutate(id)}
            isLoading={archiveMutation.isPending}
            icon={<Archive size={14} className="text-amber-400" />}
            title="Download complete folder as ZIP"
          >
            Download ZIP
          </Button>
        </div>
      </div>

      {/* Content */}
      {isError ? (
        <ErrorState onRetry={refetch} message="Could not load folder contents from Seedr." />
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface animate-pulse border border-white/5" />
          ))}
        </div>
      ) : files.length === 0 && subfolders.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl text-center max-w-md mx-auto space-y-4 bg-surface">
          <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mx-auto text-gray-500">
            <Folder size={32} />
          </div>
          <h3 className="text-lg font-bold text-white">This folder is empty</h3>
          <Button variant="secondary" size="md" onClick={() => navigate('/files')}>
            Back to Files
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subfolders */}
          {subfolders.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                Subfolders ({subfolders.length})
              </h3>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                    : 'space-y-2.5'
                }
              >
                {subfolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="rounded-2xl glass-panel border border-white/5 hover:border-blue-500/40 p-4 transition bg-surface flex items-center justify-between"
                  >
                    <Link to={`/files/open/${folder.id}`} className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                        <Folder size={22} className="fill-current" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate hover:text-blue-400">
                          {folder.name}
                        </h4>
                        {(folder.last_update || folder.created) && (
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {formatDateTimeIST(folder.last_update || folder.created)}
                          </p>
                        )}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Files ({files.length})
            </h3>
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'space-y-2.5'
              }
            >
              {files.map((file) => {
                const isVideo = file.name.match(/\.(mp4|mkv|avi|webm|mov|m4v)$/i);
                const fileId = file.id || file.folder_file_id;
                const isCopied = copiedId === fileId;

                return (
                  <div
                    key={fileId}
                    className={`group relative rounded-2xl glass-panel border border-white/5 hover:border-blue-500/40 p-4 transition bg-surface flex ${
                      viewMode === 'grid'
                        ? 'flex-col justify-between'
                        : 'flex-row items-center justify-between gap-4'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isVideo ? 'bg-blue-500/10 text-blue-400' : 'bg-surface-elevated text-gray-400'
                        }`}
                      >
                        {isVideo ? <Film size={20} /> : <File size={20} />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">{file.name}</h4>
                        <p className="text-xs text-gray-500">
                          {formatBytes(file.size)}
                          {(file.last_update || file.created) && (
                            <> • {formatDateTimeIST(file.last_update || file.created)}</>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* File Actions */}
                    <div
                      className={`flex items-center gap-1 text-gray-400 ${
                        viewMode === 'grid'
                          ? 'mt-4 pt-3 border-t border-white/5 justify-end'
                          : 'flex-shrink-0'
                      }`}
                    >
                      {isVideo && (
                        <Link
                          to={`/player/file/${fileId}`}
                          className="p-2 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-blue-500/10 transition"
                          title="Play Video"
                          aria-label="Play"
                        >
                          <Play size={16} className="fill-current" />
                        </Link>
                      )}
                      <button
                        onClick={() => handleDownloadFile(fileId)}
                        className="p-2 hover:text-white rounded-lg hover:bg-white/5 transition"
                        title="Direct Download"
                        aria-label="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleCopyLink(fileId)}
                        className={`p-2 rounded-lg transition ${
                          isCopied ? 'text-green-400 bg-green-500/10' : 'hover:text-white hover:bg-white/5'
                        }`}
                        title="Copy Link to Clipboard"
                        aria-label="Copy Link"
                      >
                        {isCopied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                      <button
                        onClick={() => {
                          setRenameTarget({ type: 'file', id: fileId, name: file.name });
                          setRenameInput(file.name);
                        }}
                        className="p-2 hover:text-white rounded-lg hover:bg-white/5 transition"
                        title="Rename"
                        aria-label="Rename File"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            type: 'file',
                            id: fileId,
                            name: file.name,
                          })
                        }
                        className="p-2 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
                        title="Delete"
                        aria-label="Delete File"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type || 'item'}?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Are you sure you want to delete <strong className="text-white">{deleteTarget?.name}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="md" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={() => deleteMutation.mutate(deleteTarget)}
              isLoading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title={`Rename ${renameTarget?.type || 'item'}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (renameInput.trim()) {
              renameMutation.mutate({
                type: renameTarget.type,
                id: renameTarget.id,
                name: renameInput.trim(),
              });
            }
          }}
          className="space-y-4"
        >
          <Input
            label="New Name"
            value={renameInput}
            onChange={(e) => setRenameInput(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="md" type="button" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={renameMutation.isPending}>
              Save Name
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OpenFolderPage;
