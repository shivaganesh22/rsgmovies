import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Folder,
  File,
  Film,
  Plus,
  Trash2,
  Edit2,
  Download,
  Copy,
  Lock,
  Unlock,
  Archive,
  Play,
  HardDrive,
  RefreshCw,
  Search,
  LayoutGrid,
  List,
  Share2,
  Check,
  ExternalLink,
} from 'lucide-react';
import seedrApi from '../../api/seedr';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ErrorState from '../../components/ui/ErrorState';
import { toastSuccess, toastWarning, toastError } from '../../components/ui/Notifications';
import { formatDateTimeIST } from '../../utils/media';

export const FilesPage = () => {
  const queryClient = useQueryClient();
  const { setStorageInfo } = useAuth();

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('rsg_files_view_mode') || 'grid';
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('rsg_files_view_mode', mode);
  };
  const [filterSearch, setFilterSearch] = useState('');
  const [isAddTorrentOpen, setIsAddTorrentOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeShareItem, setActiveShareItem] = useState(null); // for sharing a specific file/folder
  const [shareLinkLoading, setShareLinkLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [torrentLinkInput, setTorrentLinkInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Modals state for item actions
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  // Fetch Seedr Files
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['seedrFiles'],
    queryFn: () => seedrApi.getFiles(),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      const torrents = query.state.data?.torrents || [];
      return torrents.length > 0 ? 3000 : 10000; // 10s recurring sync, 3s when torrents are active
    },
  });

  const folders = data?.folders || [];
  const files = data?.files || [];
  const torrents = data?.torrents || [];
  const spaceUsed = data?.space_used || 0;
  const spaceMax = data?.space_max || 1;

  // Format Storage Quota
  useEffect(() => {
    if (data?.space_max) {
      const usedGB = (spaceUsed / (1024 * 1024 * 1024)).toFixed(1);
      const maxGB = (spaceMax / (1024 * 1024 * 1024)).toFixed(1);
      setStorageInfo(`${usedGB} / ${maxGB} GB`);
    }
  }, [data, spaceUsed, spaceMax, setStorageInfo]);

  // Add Torrent Mutation
  const addTorrentMutation = useMutation({
    mutationFn: (link) => seedrApi.addTorrent(link),
    onSuccess: (res) => {
      if (res?.result === true || res?.title || !res?.error) {
        toastSuccess('Torrent added to Seedr successfully!');
        setIsAddTorrentOpen(false);
        setTorrentLinkInput('');
        queryClient.invalidateQueries({ queryKey: ['seedrFiles'] });
      } else {
        toastWarning(res?.error || 'Failed to add torrent.');
      }
    },
    onError: (err) => {
      toastError(err.response?.data?.error?.message || 'Error adding torrent.');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ type, id, name, title }) => {
      const itemTitle = name || title || '';
      if (type === 'torrent') return seedrApi.deleteTorrent(id, itemTitle);
      if (type === 'folder') return seedrApi.deleteFolder(id, itemTitle);
      if (type === 'file') return seedrApi.deleteFile(id, itemTitle);
    },
    onSuccess: () => {
      toastSuccess('Item deleted successfully.');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['seedrFiles'] });
    },
    onError: (err) => {
      toastError(err.response?.data?.error?.message || 'Error deleting item.');
    },
  });

  // Rename Mutation
  const renameMutation = useMutation({
    mutationFn: async ({ type, id, name }) => {
      if (type === 'folder') return seedrApi.renameFolder(id, name);
      if (type === 'file') return seedrApi.renameFile(id, name);
    },
    onSuccess: () => {
      toastSuccess('Item renamed successfully.');
      setRenameTarget(null);
      setRenameInput('');
      queryClient.invalidateQueries({ queryKey: ['seedrFiles'] });
    },
    onError: (err) => {
      toastError(err.response?.data?.error?.message || 'Error renaming item.');
    },
  });

  // Lock Mutation
  const lockMutation = useMutation({
    mutationFn: (folderId) => seedrApi.lockFolder(folderId),
    onSuccess: (res) => {
      toastSuccess(res?.detail || 'Folder lock toggled.');
      queryClient.invalidateQueries({ queryKey: ['seedrFiles'] });
    },
    onError: () => toastError('Failed to toggle folder lock.'),
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
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('target', '_blank');
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        link.remove();
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
        toastSuccess('Direct link copied to clipboard!');
        setTimeout(() => setCopiedId(null), 2500);
      } else {
        toastWarning('Could not copy link.');
      }
    } catch (e) {
      toastError('Failed to copy file link.');
    }
  };

  // Open Share Modal for a specific file or folder
  const handleOpenShare = async (item, type = 'file') => {
    setActiveShareItem({ ...item, type });
    setShareUrl('');
    setIsShareModalOpen(true);
    setShareLinkLoading(true);

    try {
      if (type === 'file') {
        const res = await seedrApi.getFile(item.id);
        setShareUrl(res?.url || res?.link || '');
      } else {
        // For folder: create or retrieve archive/open URL
        setShareUrl(`${window.location.origin}/files/open/${item.id}`);
      }
    } catch (e) {
      setShareUrl('');
    } finally {
      setShareLinkLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(filterSearch.toLowerCase())
  );
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(filterSearch.toLowerCase())
  );

  const usedPercentage = Math.min(Math.round((spaceUsed / spaceMax) * 100), 100);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header & Storage Quota */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-4 sm:p-6 rounded-3xl border border-white/10 shadow-xl bg-surface">
        <div>
          <h1 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
            Seedr Cloud Files
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Cloud torrents, direct streaming, downloads, and archives.
          </p>
        </div>

        {/* Quota Gauge & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Storage Bar */}
          <div className="w-full sm:w-44 bg-surface-elevated p-2.5 rounded-2xl border border-white/5">
            <div className="flex justify-between text-xs text-gray-300 font-semibold mb-1">
              <span className="flex items-center gap-1">
                <HardDrive size={11} className="text-blue-400" />
                Storage
              </span>
              <span>{usedPercentage}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usedPercentage > 85 ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${usedPercentage}%` }}
              />
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddTorrentOpen(true)}
            icon={<Plus size={15} />}
          >
            Add Torrent
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            icon={<RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Torrents Section (If Any) */}
      {torrents.length > 0 && (
        <section className="glass-panel p-5 rounded-3xl border border-blue-500/30 shadow-xl bg-blue-950/10 space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            Active Downloading Torrents ({torrents.length})
          </h2>

          <div className="space-y-2">
            {torrents.map((t) => (
              <div
                key={t.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-surface-card border border-white/5"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{t.name || t.title}</h4>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                    <span>Size: {formatBytes(t.size)}</span>
                    <span>Progress: {t.progress || 0}%</span>
                    <span className="capitalize text-blue-400 font-medium">{t.connected || 'Downloading'}</span>
                    {(t.last_update || t.created) && (
                      <span>Added: {formatDateTimeIST(t.last_update || t.created)}</span>
                    )}
                  </div>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() =>
                    setDeleteTarget({ type: 'torrent', id: t.id, name: t.name || t.title })
                  }
                  icon={<Trash2 size={13} />}
                >
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Toolbar: Search Filter & View Mode Toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="max-w-xs w-full flex-1 min-w-[180px]">
          <Input
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Filter files & folders..."
            icon={<Search size={14} />}
          />
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-gray-700">
          <button
            onClick={() => handleSetViewMode('grid')}
            className={`p-1.5 sm:px-2.5 rounded-lg transition flex items-center gap-1 text-xs font-semibold ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
            title="Grid View"
          >
            <LayoutGrid size={15} />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => handleSetViewMode('list')}
            className={`p-1.5 sm:px-2.5 rounded-lg transition flex items-center gap-1 text-xs font-semibold ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
            title="List View"
          >
            <List size={15} />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Content Display */}
      {isError ? (
        error?.response?.data?.error?.code === 'NO_SEEDR_ACCOUNT' ? (
          <div className="glass-panel p-8 sm:p-12 rounded-3xl text-center max-w-lg mx-auto space-y-4 bg-surface border border-amber-500/30">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto text-2xl border border-amber-500/20">
              <HardDrive size={32} />
            </div>
            <h3 className="text-lg font-bold text-white">No Seedr Account Assigned</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Your profile is not currently linked to a Seedr cloud storage pool. Please contact an administrator to assign a Seedr account to your profile.
            </p>
          </div>
        ) : (
          <ErrorState onRetry={refetch} message={error?.response?.data?.error?.message || "Could not fetch files from Seedr. Please check your credentials or try again."} />
        )
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredFolders.length === 0 && filteredFiles.length === 0 ? (
        <div className="glass-panel p-10 rounded-3xl text-center max-w-md mx-auto space-y-3 bg-surface">
          <div className="w-14 h-14 rounded-full bg-surface-elevated flex items-center justify-center mx-auto text-gray-500">
            <Folder size={28} />
          </div>
          <h3 className="text-base font-bold text-white">Your Seedr storage is empty</h3>
          <p className="text-xs text-gray-400">
            Add a torrent magnet link to start downloading media into your cloud storage.
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsAddTorrentOpen(true)}>
            Add Torrent
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Folders Section */}
          {filteredFolders.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Folders ({filteredFolders.length})
              </h3>

              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4'
                    : 'space-y-2'
                }
              >
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`group relative rounded-2xl glass-panel border border-white/5 hover:border-blue-500/40 p-3.5 transition-all duration-200 bg-surface flex ${
                      viewMode === 'grid'
                        ? 'flex-col justify-between'
                        : 'flex-row items-center justify-between gap-3'
                    }`}
                  >
                    <Link
                      to={`/files/open/${folder.id}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                        <Folder size={20} className="fill-current" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-blue-400 transition">
                          {folder.name}
                        </h4>
                        <p className="text-[11px] text-gray-500">
                          {formatDateTimeIST(folder.last_update || folder.created) || 'Folder'}
                        </p>
                      </div>
                    </Link>

                    {/* Actions Toolbar */}
                    <div
                      className={`flex items-center gap-1 text-gray-400 ${
                        viewMode === 'grid'
                          ? 'mt-3 pt-2.5 border-t border-white/5 justify-end'
                          : 'flex-shrink-0'
                      }`}
                    >
                      <button
                        onClick={() => archiveMutation.mutate(folder.id)}
                        className="p-1.5 hover:text-white rounded-lg hover:bg-white/5 transition"
                        title="Download ZIP Archive"
                        aria-label="Download Archive"
                      >
                        <Archive size={15} />
                      </button>
                      <button
                        onClick={() => handleOpenShare(folder, 'folder')}
                        className="p-1.5 hover:text-white rounded-lg hover:bg-white/5 transition"
                        title="Share Folder"
                        aria-label="Share"
                      >
                        <Share2 size={15} />
                      </button>
                      <button
                        onClick={() => lockMutation.mutate(folder.id)}
                        className="p-1.5 hover:text-white rounded-lg hover:bg-white/5 transition"
                        title="Lock/Unlock Folder"
                        aria-label="Lock or Unlock"
                      >
                        {folder.is_locked ? (
                          <Lock size={15} className="text-amber-400" />
                        ) : (
                          <Unlock size={15} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setRenameTarget({ type: 'folder', id: folder.id, name: folder.name });
                          setRenameInput(folder.name);
                        }}
                        className="p-1.5 hover:text-white rounded-lg hover:bg-white/5 transition"
                        title="Rename"
                        aria-label="Rename Folder"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name })
                        }
                        className="p-1.5 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
                        title="Delete"
                        aria-label="Delete Folder"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Section */}
          {filteredFiles.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Files ({filteredFiles.length})
              </h3>

              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4'
                    : 'space-y-2'
                }
              >
                {filteredFiles.map((file) => {
                  const isVideo = file.name.match(/\.(mp4|mkv|avi|webm|mov|m4v)$/i);
                  const isCopied = copiedId === file.id;

                  return (
                    <div
                      key={file.id}
                      className={`group relative rounded-2xl glass-panel border border-white/5 hover:border-blue-500/40 p-3.5 transition-all duration-200 bg-surface flex ${
                        viewMode === 'grid'
                          ? 'flex-col justify-between'
                          : 'flex-row items-center justify-between gap-3'
                      }`}
                    >
                      <div
                        onClick={() => {
                          if (isVideo) {
                            navigate(`/player/file/${file.id}`);
                          }
                        }}
                        className={`flex items-center gap-3 min-w-0 flex-1 ${
                          isVideo ? 'cursor-pointer group/title' : ''
                        }`}
                        title={isVideo ? 'Click to play video' : file.name}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform ${
                            isVideo
                              ? 'bg-blue-500/10 text-blue-400 group-hover:scale-105 group-hover:bg-blue-500/20'
                              : 'bg-surface-elevated text-gray-400'
                          }`}
                        >
                          {isVideo ? <Film size={18} /> : <File size={18} />}
                        </div>
                        <div className="min-w-0">
                          <h4
                            className={`text-xs sm:text-sm font-semibold text-white truncate transition-colors ${
                              isVideo ? 'group-hover/title:text-blue-400 hover:text-blue-400' : ''
                            }`}
                          >
                            {file.name}
                          </h4>
                          <p className="text-[11px] text-gray-500">
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
                            ? 'mt-3 pt-2.5 border-t border-white/5 justify-end'
                            : 'flex-shrink-0'
                        }`}
                      >
                        {isVideo && (
                          <Link
                            to={`/player/file/${file.id}`}
                            className="p-1.5 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-blue-500/10 transition"
                            title="Play Video"
                            aria-label="Play"
                          >
                            <Play size={15} className="fill-current" />
                          </Link>
                        )}
                        <button
                          onClick={() => handleDownloadFile(file.id)}
                          className="p-1.5 hover:text-white rounded-lg hover:bg-white/5 transition"
                          title="Direct Download"
                          aria-label="Download"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          onClick={() => handleCopyLink(file.id)}
                          className={`p-1.5 rounded-lg transition ${
                            isCopied ? 'text-green-400 bg-green-500/10' : 'hover:text-white hover:bg-white/5'
                          }`}
                          title="Copy Link"
                          aria-label="Copy Link"
                        >
                          {isCopied ? <Check size={15} /> : <Copy size={15} />}
                        </button>
                        <button
                          onClick={() => handleOpenShare(file, 'file')}
                          className="p-1.5 hover:text-white rounded-lg hover:bg-white/5 transition"
                          title="Share Options"
                          aria-label="Share"
                        >
                          <Share2 size={15} />
                        </button>
                        <button
                          onClick={() => {
                            setRenameTarget({ type: 'file', id: file.id, name: file.name });
                            setRenameInput(file.name);
                          }}
                          className="p-1.5 hover:text-white rounded-lg hover:bg-white/5 transition"
                          title="Rename"
                          aria-label="Rename File"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({ type: 'file', id: file.id, name: file.name })
                          }
                          className="p-1.5 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
                          title="Delete"
                          aria-label="Delete File"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Torrent Modal */}
      <Modal
        isOpen={isAddTorrentOpen}
        onClose={() => setIsAddTorrentOpen(false)}
        title="Add Torrent to Seedr"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (torrentLinkInput.trim()) {
              addTorrentMutation.mutate(torrentLinkInput.trim());
            }
          }}
          className="space-y-4"
        >
          <Input
            label="Magnet Link or Torrent URL"
            value={torrentLinkInput}
            onChange={(e) => setTorrentLinkInput(e.target.value)}
            placeholder="magnet:?xt=urn:btih:..."
            required
            autoFocus
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setIsAddTorrentOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={addTorrentMutation.isPending}
            >
              Start Download
            </Button>
          </div>
        </form>
      </Modal>

      {/* Share / My Share Modal */}
      <Modal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        title={activeShareItem ? `Share "${activeShareItem.name}"` : 'My Share — Cloud Hub'}
      >
        <div className="space-y-4 text-sm text-gray-300">
          {shareLinkLoading ? (
            <div className="py-8 flex justify-center items-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {shareUrl && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400">Direct Link:</label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      className="w-full bg-surface-elevated text-xs font-mono text-white p-2.5 rounded-xl border border-gray-700 truncate"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        toastSuccess('Link copied to clipboard!');
                      }}
                      icon={<Copy size={14} />}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              {/* External Player Stream Helpers */}
              {activeShareItem?.type === 'file' && shareUrl && (
                <div className="p-3.5 rounded-2xl bg-surface-elevated border border-white/5 space-y-2.5">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Play size={14} className="text-blue-400" />
                    External Players Stream Link
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Paste this link into VLC, MX Player, IINA, or Kodi to stream with native hardware acceleration.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <a
                      href={`vlc://${shareUrl}`}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-orange-600/80 hover:bg-orange-600 text-white transition flex items-center gap-1"
                    >
                      Open in VLC
                    </a>
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-surface hover:bg-gray-700 text-gray-300 hover:text-white transition flex items-center gap-1"
                    >
                      Direct Stream <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="md" onClick={() => setIsShareModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.type || 'item'}?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Are you sure you want to delete <strong className="text-white">{deleteTarget?.name}</strong>? This action cannot be undone.
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
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={renameMutation.isPending}
            >
              Save Name
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FilesPage;
