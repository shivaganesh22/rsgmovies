import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Search,
  Download,
  Plus,
  Sparkles,
  Film,
  ExternalLink,
  HardDrive,
  Magnet,
  Copy,
  Check,
  ArrowUp,
  ArrowDown,
  Activity,
  ArrowRight,
} from 'lucide-react';
import blastApi from '../../api/blast';
import istreamApi from '../../api/istream';
import movieboxApi from '../../api/moviebox';
import scrapersApi from '../../api/scrapers';
import seedrApi from '../../api/seedr';
import MediaCard from '../../components/media/MediaCard';
import { MediaCardSkeleton } from '../../components/ui/Skeleton';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { toastSuccess, toastWarning, toastError } from '../../components/ui/Notifications';
import { getIStreamLink } from '../istream/IStreamHome';

export const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('blast');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [actionLoadingIndex, setActionLoadingIndex] = useState(null);

  const handleSearch = (e) => {
    e?.preventDefault();
    const trimmed = queryInput.trim();
    if (trimmed) {
      setSearchParams({ q: trimmed });
    } else {
      setSearchParams({});
    }
  };

  const { data: blastData, isLoading: isBlastLoading } = useQuery({
    queryKey: ['searchBlast', initialQuery],
    queryFn: () => blastApi.search(initialQuery),
    enabled: Boolean(initialQuery) && activeTab === 'blast',
  });

  const { data: movieboxData, isLoading: isMovieboxLoading } = useQuery({
    queryKey: ['searchMoviebox', initialQuery],
    queryFn: () => movieboxApi.search(initialQuery),
    enabled: Boolean(initialQuery) && activeTab === 'moviebox',
  });

  const { data: istreamData, isLoading: isIStreamLoading } = useQuery({
    queryKey: ['searchIstream', initialQuery],
    queryFn: () => istreamApi.search(initialQuery),
    enabled: Boolean(initialQuery) && activeTab === 'istream',
  });

  /*
  const { data: movierulzData, isLoading: isMovierulzLoading } = useQuery({
    queryKey: ['searchMovierulz', initialQuery],
    queryFn: () => scrapersApi.searchMovierulz(initialQuery),
    enabled: Boolean(initialQuery) && activeTab === 'movierulz',
  });
  */
  const movierulzData = null;
  const isMovierulzLoading = false;

  const { data: torrentData, isLoading: isTorrentLoading } = useQuery({
    queryKey: ['searchTorrents', initialQuery],
    queryFn: () => scrapersApi.searchTorrents(initialQuery),
    enabled: Boolean(initialQuery) && activeTab === 'torrents',
  });

  const addTorrentMutation = useMutation({
    mutationFn: async ({ link, itemIndex }) => {
      setActionLoadingIndex(itemIndex);
      let magnetUri = link;
      if (link && !link.startsWith('magnet:')) {
        const res = await scrapersApi.getTorrentMagnet(link);
        magnetUri = res?.magnet;
      }
      if (!magnetUri) {
        throw new Error('Could not resolve magnet URI for this torrent.');
      }
      return seedrApi.addTorrent(magnetUri);
    },
    onSuccess: (res) => {
      setActionLoadingIndex(null);
      if (res?.wishlist === true) {
        toastWarning(res?.message || 'File exceeds available Seedr storage space. Added to Wishlist.');
      } else if (res?.result === true || res?.title || (!res?.error && res?.code !== 'NO_SEEDR_ACCOUNT')) {
        toastSuccess('Torrent added to Seedr! Downloading in cloud.');
      } else if (res?.error?.code === 'NO_SEEDR_ACCOUNT' || res?.code === 'NO_SEEDR_ACCOUNT') {
        toastError('No Seedr account is linked to your profile. Please contact an administrator.');
      } else {
        toastWarning(res?.error?.message || res?.error || 'Failed to add torrent to Seedr.');
      }
      setTimeout(() => {
        navigate('/files');
      }, 700);
    },
    onError: (err) => {
      setActionLoadingIndex(null);
      const errMsg = err?.response?.data?.error?.message || err?.message || 'Error connecting to Seedr.';
      toastError(errMsg);
    },
  });

  const handleCopyMagnet = async (link, idx) => {
    try {
      setActionLoadingIndex(idx);
      let magnetUri = link;
      if (link && !link.startsWith('magnet:')) {
        const magnetRes = await scrapersApi.getTorrentMagnet(link);
        magnetUri = magnetRes?.magnet;
      }
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
      let magnetUri = link;
      if (link && !link.startsWith('magnet:')) {
        const magnetRes = await scrapersApi.getTorrentMagnet(link);
        magnetUri = magnetRes?.magnet;
      }
      if (!magnetUri) {
        toastError('Could not fetch magnet link.');
        return;
      }
      window.location.href = magnetUri;
      toastSuccess('Launching torrent in client...');
    } catch {
      toastError('Failed to launch magnet URI.');
    } finally {
      setActionLoadingIndex(null);
    }
  };

  const blastResults = Array.isArray(blastData)
    ? blastData
    : blastData?.search || blastData?.movies || blastData?.data || [];
  const istreamResults = Array.isArray(istreamData)
    ? istreamData
    : istreamData?.search || istreamData?.movies || istreamData?.data || [];
  const movieboxResults = Array.isArray(movieboxData) ? movieboxData : [];
  const movierulzResults = movierulzData?.movies || [];
  const torrentResults = torrentData?.torrents || torrentData?.links || [];
  const totalTorrentsFound = torrentData?.total_results || torrentResults.length;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header & Search Box */}
      <div className="text-center max-w-2xl mx-auto space-y-4 pt-4">
        <h1 className="text-3xl sm:text-4xl font-black font-display text-white tracking-tight">
          Find Movies, Series & Media
        </h1>
        <p className="text-sm text-gray-400">
          Search across MovieBlast, Moviebox, iStreamFlare, Movierulz, and live multi-tracker torrent engine.
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-lg mx-auto pt-2">
          <Input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Search by title, actor, or keyword..."
            icon={<Search size={18} />}
            autoFocus
          />
          <Button variant="primary" size="md" type="submit">
            Search
          </Button>
        </form>
      </div>

      {/* Tabs */}
      {initialQuery && (
        <div className="flex justify-center border-b border-white/10 pb-4">
          <div className="flex flex-wrap bg-surface-elevated p-1.5 rounded-2xl border border-gray-700/60 gap-1">
            <button
              onClick={() => setActiveTab('blast')}
              className={`px-4 sm:px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
                activeTab === 'blast'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles size={14} />
              <span>MovieBlast {isBlastLoading ? '(…)' : blastData ? `(${blastResults.length})` : ''}</span>
            </button>
            <button
              onClick={() => setActiveTab('moviebox')}
              className={`px-4 sm:px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
                activeTab === 'moviebox'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>Moviebox {isMovieboxLoading ? '(…)' : movieboxData ? `(${movieboxResults.length})` : ''}</span>
            </button>
            <button
              onClick={() => setActiveTab('istream')}
              className={`px-4 sm:px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
                activeTab === 'istream'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles size={14} className="text-blue-400" />
              <span>iStreamFlare {isIStreamLoading ? '(…)' : istreamData ? `(${istreamResults.length})` : ''}</span>
            </button>
           
            <button
              onClick={() => setActiveTab('torrents')}
              className={`px-4 sm:px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
                activeTab === 'torrents'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Download size={14} />
              <span>Torrents & Magnets {isTorrentLoading ? '(…)' : torrentData ? `(${totalTorrentsFound})` : ''}</span>
            </button>
             <button
              onClick={() => {
                const query = initialQuery || queryInput || '';
                const movierulzUrl = `https://www.5movierulz.green/search_movies?s=${encodeURIComponent(query)}`;
                window.open(movierulzUrl, '_blank', 'noopener,noreferrer');
              }}
              title="Open search on Movierulz in a new tab"
              className="px-4 sm:px-5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/5"
            >
              <Film size={14} />
              <span>Movierulz</span>
              <ExternalLink size={12} className="text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* Results Section */}
      {!initialQuery ? (
        <EmptyState
          title="Search for anything"
          message="Enter a search term above to discover movies, TV series, Movierulz releases, or torrents."
          icon={<Search size={32} />}
        />
      ) : activeTab === 'blast' ? (
        isBlastLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        ) : blastResults.length === 0 ? (
          <EmptyState
            title="No catalog results found"
            message={`No titles matched "${initialQuery}" in the streaming catalog. Try searching iStreamFlare or Movierulz.`}
            action={
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setActiveTab('istream')}>
                  Search iStreamFlare
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const query = initialQuery || queryInput || '';
                    const movierulzUrl = `https://www.5movierulz.green/search_movies?s=${encodeURIComponent(query)}`;
                    window.open(movierulzUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center gap-1.5"
                >
                  <span>Search Movierulz</span>
                  <ExternalLink size={12} />
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {blastResults.map((item, idx) => (
              <MediaCard key={item?.id || idx} {...item} />
            ))}
          </div>
        )
      ) : activeTab === 'moviebox' ? (
        isMovieboxLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        ) : movieboxResults.length === 0 ? (
          <EmptyState
            title="No Moviebox results"
            message={`No titles matched "${initialQuery}" on Moviebox.`}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {movieboxResults.map((item, idx) => (
              <MediaCard
                key={item.subject_id || idx}
                title={item.title}
                poster={item.cover}
                image={item.cover}
                rating={item.imdb_rating}
                vote_average={item.imdb_rating}
                badge={item.type && item.type.toLowerCase() !== 'hindi' ? item.type : ''}
                year={item.release_date ? item.release_date.substring(0, 4) : ''}
                targetLink={`/moviebox/detail/${item.subject_id}`}
                type={item.subject_type === 2 ? 'series' : 'movie'}
              />
            ))}
          </div>
        )
      ) : activeTab === 'istream' ? (
        isIStreamLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        ) : istreamResults.length === 0 ? (
          <EmptyState
            title="No iStreamFlare results"
            message={`No titles matched "${initialQuery}" on iStreamFlare.`}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {istreamResults.map((item, idx) => (
              <MediaCard
                key={item?.id || idx}
                {...item}
                targetLink={getIStreamLink(item)}
                badge={item.custom_tag?.custom_tags_name || item.custom_tags_name || item.quality}
              />
            ))}
          </div>
        )
      ) : activeTab === 'movierulz' ? (
        <EmptyState
          title="Search on Movierulz"
          message={`Click below to open Movierulz directly and view search results for "${initialQuery}".`}
          icon={<Film size={36} className="text-blue-400" />}
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const query = initialQuery || queryInput || '';
                const movierulzUrl = `https://www.5movierulz.green/search_movies?s=${encodeURIComponent(query)}`;
                window.open(movierulzUrl, '_blank', 'noopener,noreferrer');
              }}
              className="flex items-center gap-2"
            >
              <span>Open Movierulz for "{initialQuery}"</span>
              <ExternalLink size={14} />
            </Button>
          }
        />
      ) : isTorrentLoading ? (
        <div className="space-y-3 max-w-4xl mx-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : torrentResults.length === 0 ? (
        <EmptyState
          title="No torrents found"
          message={`No multi-tracker torrents matched "${initialQuery}".`}
        />
      ) : (
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Summary bar with link to full torrents page */}
          <div className="flex items-center justify-between text-xs text-gray-400 px-1 font-semibold">
            <span>
              Found <strong className="text-white">{totalTorrentsFound}</strong> verified torrents
            </span>
            <Link
              to={`/torrents?q=${encodeURIComponent(initialQuery)}`}
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold"
            >
              <span>View in Torrent Search Engine</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="space-y-3">
            {torrentResults.map((t, idx) => {
              const resTag = t.resolution || 'HD';
              const is4K = resTag.includes('4K') || resTag.includes('2160');
              const is1080 = resTag.includes('1080');
              const is720 = resTag.includes('720');
              const isPendingAction = actionLoadingIndex === idx;

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl bg-surface-elevated border border-white/5 hover:border-emerald-500/30 transition group shadow"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
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

                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition truncate block">
                        {t.title || t.name}
                      </span>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-gray-400">
                        {t.size && (
                          <span className="font-semibold text-gray-200 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                            {t.size}
                          </span>
                        )}
                        {t.seeds !== undefined && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                            <ArrowUp size={12} />
                            <span>{t.seeds} seeds</span>
                          </span>
                        )}
                        {t.leech !== undefined && (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                            <ArrowDown size={12} />
                            <span>{t.leech} leech</span>
                          </span>
                        )}
                        {t.health && (
                          <span className="inline-flex items-center gap-1 text-cyan-400">
                            <Activity size={12} />
                            <span>Health: {t.health}/10</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 sm:flex-none justify-center whitespace-nowrap text-xs font-bold"
                      onClick={() => addTorrentMutation.mutate({ link: t.link, itemIndex: idx })}
                      isLoading={isPendingAction && addTorrentMutation.isPending}
                      icon={<Plus size={14} />}
                    >
                      Add to Seedr
                    </Button>

                    <button
                      onClick={() => handleOpenMagnet(t.link, idx)}
                      disabled={isPendingAction}
                      className="w-9 h-9 rounded-xl bg-surface hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition flex items-center justify-center flex-shrink-0 shadow"
                      title="Open Magnet in Client"
                    >
                      <Magnet size={15} className="text-emerald-400" />
                    </button>

                    <button
                      onClick={() => handleCopyMagnet(t.link, idx)}
                      disabled={isPendingAction}
                      className="w-9 h-9 rounded-xl bg-surface hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition flex items-center justify-center flex-shrink-0 shadow"
                      title="Copy Magnet URI"
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
        </div>
      )}
    </div>
  );
};

export default SearchPage;
