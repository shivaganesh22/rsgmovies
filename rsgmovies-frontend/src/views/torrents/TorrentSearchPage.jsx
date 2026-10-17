import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Search,
  X,
  Download,
  Plus,
  Copy,
  Check,
  Magnet,
  HardDrive,
  ArrowUp,
  ArrowDown,
  Activity,
  SlidersHorizontal,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import scrapersApi from '../../api/scrapers';
import seedrApi from '../../api/seedr';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { toastSuccess, toastWarning, toastError } from '../../components/ui/Notifications';

export const TorrentSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlQuery = searchParams.get('q') || searchParams.get('search') || '';
  const urlPage = parseInt(searchParams.get('page'), 10) || 1;

  const [searchInputValue, setSearchInputValue] = useState(urlQuery);
  const [activeQuery, setActiveQuery] = useState(urlQuery);
  const [currentPage, setCurrentPage] = useState(urlPage);

  const [resolutionFilter, setResolutionFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('SEEDS'); // 'SEEDS', 'SIZE', 'HEALTH'
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [actionLoadingIndex, setActionLoadingIndex] = useState(null);

  // Sync state if URL search param changes
  useEffect(() => {
    if (urlQuery !== activeQuery) {
      setSearchInputValue(urlQuery);
      setActiveQuery(urlQuery);
    }
    if (urlPage !== currentPage) {
      setCurrentPage(urlPage);
    }
  }, [urlQuery, urlPage]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['torrentSearch', activeQuery, currentPage],
    queryFn: () => scrapersApi.searchTorrents(activeQuery, currentPage),
    enabled: Boolean(activeQuery && activeQuery.trim().length > 0),
    staleTime: 1000 * 60 * 5, // 5 min cache
  });

  const addTorrentMutation = useMutation({
    mutationFn: async ({ link, itemIndex }) => {
      setActionLoadingIndex(itemIndex);
      // Fetch magnet link from backend
      const magnetRes = await scrapersApi.getTorrentMagnet(link);
      const magnetUri = magnetRes?.magnet;
      if (!magnetUri) {
        throw new Error('Could not resolve magnet URI for this torrent.');
      }
      // Add magnet to Seedr
      const seedrRes = await seedrApi.addTorrent(magnetUri);
      return seedrRes;
    },
    onSuccess: (res) => {
      setActionLoadingIndex(null);
      if (res?.wishlist === true) {
        toastWarning(res?.message || 'File exceeds available Seedr storage space. Added to Wishlist.');
      } else if (res?.result === true || res?.title || (!res?.error && res?.code !== 'NO_SEEDR_ACCOUNT')) {
        toastSuccess('Torrent added to Seedr! Downloading in cloud.');
      } else {
        const errorMsg = res?.error?.message || res?.error || 'Failed to add torrent to Seedr.';
        if (errorMsg.includes('credentials missing') || errorMsg.includes('NO_SEEDR_ACCOUNT') || errorMsg.includes('assigned')) {
          toastError('Seedr account is not authenticated. Please configure Seedr credentials in Admin Panel.');
        } else {
          toastWarning(errorMsg);
        }
      }
      // Redirect to files page after adding torrent
      setTimeout(() => {
        navigate('/files');
      }, 700);
    },
    onError: (err) => {
      setActionLoadingIndex(null);
      const errMsg = err?.response?.data?.error?.message || err?.message || 'Error connecting to Seedr.';
      if (errMsg.includes('credentials missing') || errMsg.includes('NO_SEEDR_ACCOUNT') || errMsg.includes('assigned')) {
        toastError('Seedr account credentials missing. Please configure your Seedr account in Admin settings.');
      } else {
        toastError(errMsg);
      }
    },
  });

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const cleanQuery = searchInputValue.trim();
    if (!cleanQuery) return;
    setCurrentPage(1);
    setSearchParams({ q: cleanQuery, page: '1' });
    setActiveQuery(cleanQuery);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > (data?.total_pages || 1)) return;
    setCurrentPage(newPage);
    setSearchParams({ q: activeQuery, page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyMagnet = async (link, idx) => {
    try {
      setActionLoadingIndex(idx);
      const magnetRes = await scrapersApi.getTorrentMagnet(link);
      const magnetUri = magnetRes?.magnet;
      if (!magnetUri) {
        toastError('Could not fetch magnet link.');
        return;
      }
      navigator.clipboard.writeText(magnetUri);
      setCopiedIndex(idx);
      toastSuccess('Magnet URI copied to clipboard!');
      setTimeout(() => setCopiedIndex(null), 2500);
    } catch {
      toastError('Failed to retrieve magnet URI.');
    } finally {
      setActionLoadingIndex(null);
    }
  };

  const handleOpenMagnet = async (link, idx) => {
    try {
      setActionLoadingIndex(idx);
      const magnetRes = await scrapersApi.getTorrentMagnet(link);
      const magnetUri = magnetRes?.magnet;
      if (!magnetUri) {
        toastError('Could not fetch magnet link.');
        return;
      }
      window.location.href = magnetUri;
      toastSuccess('Launching torrent in your client...');
    } catch {
      toastError('Failed to launch magnet URI.');
    } finally {
      setActionLoadingIndex(null);
    }
  };

  // Raw items from API
  const rawTorrents = data?.torrents || [];
  const totalResults = data?.total_results || 0;
  const totalPages = data?.total_pages || 1;

  // Filter & Sort Logic
  const filteredTorrents = rawTorrents.filter((item) => {
    if (resolutionFilter === 'ALL') return true;
    const res = (item.resolution || '').toUpperCase();
    if (resolutionFilter === '4K') return res.includes('4K') || res.includes('2160');
    if (resolutionFilter === '1080P') return res.includes('1080');
    if (resolutionFilter === '720P') return res.includes('720');
    if (resolutionFilter === 'HDRIP') return res.includes('HDRIP') || res.includes('WEB-DL') || res.includes('BLURAY');
    return true;
  });

  const sortedTorrents = [...filteredTorrents].sort((a, b) => {
    if (sortBy === 'SEEDS') {
      return (parseInt(b.seeds, 10) || 0) - (parseInt(a.seeds, 10) || 0);
    }
    if (sortBy === 'HEALTH') {
      return (parseInt(b.health, 10) || 0) - (parseInt(a.health, 10) || 0);
    }
    if (sortBy === 'SIZE') {
      const parseSizeInBytes = (str) => {
        if (!str) return 0;
        const num = parseFloat(str) || 0;
        if (str.toUpperCase().includes('GB')) return num * 1024 * 1024 * 1024;
        if (str.toUpperCase().includes('MB')) return num * 1024 * 1024;
        if (str.toUpperCase().includes('KB')) return num * 1024;
        return num;
      };
      return parseSizeInBytes(b.size) - parseSizeInBytes(a.size);
    }
    return 0;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-20">
      {/* Header & Search Bar (Clean layout like Movierulz / TamilMV) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
            <Sparkles size={13} />
            <span>Multi-Tracker Torrent Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
            Torrent Search
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Search verified torrents across high-speed trackers with direct 1-click Seedr cloud downloading.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md w-full">
          <Input
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
            placeholder="Search movie, series, show name..."
            icon={<Search size={16} />}
          />
          <Button variant="primary" size="md" type="submit" isLoading={isLoading} className="font-bold flex-shrink-0">
            Search
          </Button>
        </form>
      </div>

      {/* Quality Filter Pills & Sort Selector */}
      {activeQuery && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-surface-elevated border border-white/5 shadow">
          {/* Quality Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-gray-400 mr-1 flex items-center gap-1">
              <Filter size={13} />
              <span>Quality:</span>
            </span>
            {['ALL', '4K', '1080P', '720P', 'HDRIP'].map((res) => (
              <button
                key={res}
                onClick={() => setResolutionFilter(res)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  resolutionFilter === res
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-surface hover:bg-white/10 text-gray-400 hover:text-gray-200 border border-white/5'
                }`}
              >
                {res}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <span className="font-bold text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-surface text-gray-200 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold outline-none focus:border-emerald-500"
            >
              <option value="SEEDS">Most Seeds</option>
              <option value="SIZE">File Size</option>
              <option value="HEALTH">Tracker Health</option>
            </select>
          </div>
        </div>
      )}

      {/* Search Results Feed */}
      {activeQuery ? (
        <div className="space-y-4">
          {/* Results Summary Bar */}
          <div className="flex items-center justify-between text-xs text-gray-400 px-1 font-semibold">
            <span>
              Found <strong className="text-white">{totalResults || sortedTorrents.length}</strong> total torrents for{' '}
              <span className="text-emerald-400">"{activeQuery}"</span>
              {totalPages > 1 && (
                <span className="ml-2 text-gray-500">
                  (Page {currentPage} of {totalPages})
                </span>
              )}
            </span>

            <Link
              to="/files"
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              <HardDrive size={13} />
              <span>Open Seedr Files</span>
            </Link>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl bg-surface animate-pulse border border-white/5"
                />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={refetch} message="Could not fetch torrent search results. Please retry." />
          ) : sortedTorrents.length === 0 ? (
            <EmptyState
              title="No Torrents Found"
              message={`No torrent results matched "${activeQuery}". Try searching with alternative keywords.`}
              icon={<Search size={32} />}
            />
          ) : (
            <div className="space-y-3">
              {sortedTorrents.map((item, idx) => {
                const resTag = item.resolution || 'HD';
                const is4K = resTag.includes('4K') || resTag.includes('2160');
                const is1080 = resTag.includes('1080');
                const is720 = resTag.includes('720');
                const isPendingAction = actionLoadingIndex === idx;

                const seedsNum = parseInt(item.seeds, 10) || 0;
                const leechNum = parseInt(item.leech, 10) || 0;

                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl bg-surface-elevated border border-white/5 hover:border-emerald-500/30 transition group shadow"
                  >
                    {/* Torrent Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Resolution Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${
                          is4K
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : is1080
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : is720
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-gray-700/40 text-gray-300 border border-white/5'
                        }`}
                      >
                        {resTag}
                      </span>

                      {/* Title, Size & Live Seedr/Leech Metrics */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition truncate block">
                          {item.title}
                        </span>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-gray-400">
                          {/* File Size */}
                          {item.size && (
                            <span className="font-semibold text-gray-200 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                              {item.size}
                            </span>
                          )}

                          {/* Seeds */}
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                            <ArrowUp size={12} />
                            <span>{seedsNum} seeds</span>
                          </span>

                          {/* Leechers */}
                          <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                            <ArrowDown size={12} />
                            <span>{leechNum} leech</span>
                          </span>

                          {/* Health Indicator */}
                          {item.health && (
                            <span className="inline-flex items-center gap-1 text-cyan-400">
                              <Activity size={12} />
                              <span>Health: {item.health}/10</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 1-Row Action Buttons (Add to Seedr, Open Magnet, Copy Magnet) */}
                    <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
                      {/* Primary Action: Add to Seedr */}
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 sm:flex-none justify-center whitespace-nowrap text-xs font-bold"
                        onClick={() => addTorrentMutation.mutate({ link: item.link, itemIndex: idx })}
                        isLoading={isPendingAction && addTorrentMutation.isPending}
                        icon={<Plus size={14} />}
                      >
                        Add to Seedr
                      </Button>

                      {/* Secondary Icon Action: Launch Magnet */}
                      <button
                        onClick={() => handleOpenMagnet(item.link, idx)}
                        disabled={isPendingAction}
                        className="w-9 h-9 rounded-xl bg-surface hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition flex items-center justify-center flex-shrink-0 shadow"
                        title="Open Magnet in Torrent Client"
                      >
                        <Magnet size={15} className="text-emerald-400" />
                      </button>

                      {/* Secondary Icon Action: Copy Magnet */}
                      <button
                        onClick={() => handleCopyMagnet(item.link, idx)}
                        disabled={isPendingAction}
                        className="w-9 h-9 rounded-xl bg-surface hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition flex items-center justify-center flex-shrink-0 shadow"
                        title="Copy Magnet Link"
                      >
                        {copiedIndex === idx ? (
                          <Check size={15} className="text-emerald-400" />
                        ) : (
                          <Copy size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6 border-t border-white/10">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-surface-elevated text-xs font-bold text-gray-200 border border-white/5 transition flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isLoading}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                        currentPage === pageNum
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                          : 'bg-surface hover:bg-white/10 text-gray-300 border border-white/5'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-surface-elevated text-xs font-bold text-gray-200 border border-white/5 transition flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Initial Landing View */
        <div className="rounded-3xl glass-panel p-8 sm:p-12 text-center border border-white/10 space-y-4 max-w-xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Magnet size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-white">Search Multi-Tracker Torrents</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Use the search bar above to search movies, TV shows, and anime releases with instant Seedr cloud streaming.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TorrentSearchPage;
