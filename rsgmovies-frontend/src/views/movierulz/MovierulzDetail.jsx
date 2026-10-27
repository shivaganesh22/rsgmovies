import React, { useState } from 'react';
import { useParams, useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  Plus,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  HardDrive,
  Magnet,
  Film,
} from 'lucide-react';
import scrapersApi from '../../api/scrapers';
import seedrApi from '../../api/seedr';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import { toastSuccess, toastWarning, toastError } from '../../components/ui/Notifications';

export const MovierulzDetail = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const wildcardSlug = params['*'] || '';
  const pathnameSlug = location.pathname.startsWith('/movierulz/movie/')
    ? location.pathname.replace('/movierulz/movie/', '').replace(/^\/+/, '')
    : '';

  const targetIdentifier =
    params.slug ||
    params.id ||
    wildcardSlug ||
    pathnameSlug ||
    searchParams.get('link') ||
    searchParams.get('slug') ||
    '';
  const [copiedIndex, setCopiedIndex] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['movierulzDetail', targetIdentifier],
    queryFn: () => scrapersApi.getMovierulzMovie(targetIdentifier),
    enabled: Boolean(targetIdentifier),
  });

  const addTorrentMutation = useMutation({
    mutationFn: (link) => seedrApi.addTorrent(link),
    onSuccess: (res) => {
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
      const errMsg = err?.response?.data?.error?.message || err?.message || 'Error connecting to Seedr.';
      if (errMsg.includes('credentials missing') || errMsg.includes('NO_SEEDR_ACCOUNT') || errMsg.includes('assigned')) {
        toastError('Seedr account credentials missing. Please configure your Seedr account in Admin settings.');
      } else {
        toastError(errMsg);
      }
    },
  });

  const handleCopyMagnet = (link, idx) => {
    navigator.clipboard.writeText(link);
    setCopiedIndex(idx);
    toastSuccess('Magnet link copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-400 font-semibold">Parsing movie details and torrent magnets...</p>
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={refetch} message="Could not load Movierulz movie details." />;
  }

  const details = data?.details || {};
  const links = data?.links || [];
  const meta = details?.meta || {};

  const titleName = details.name || targetIdentifier?.replace(/-/g, ' ') || 'Movie Details';
  const isCamOrDvdScr = ['CAM', 'DVDSCR', 'PREDVD', 'HDTS'].includes((details.quality || '').toUpperCase());

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto pb-20 px-2 sm:px-0">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-elevated hover:bg-white/10 text-sm font-semibold text-gray-300 hover:text-white border border-white/5 transition"
      >
        <ArrowLeft size={16} />
        <span>Back to Releases</span>
      </button>

      {/* 1. Main Hero Card */}
      <div className="relative rounded-3xl glass-panel p-5 sm:p-8 border border-white/10 overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start">
          {/* Poster */}
          {details.image ? (
            <div className="w-44 sm:w-56 aspect-[2/3] rounded-2xl overflow-hidden bg-surface flex-shrink-0 shadow-2xl border border-white/10">
              <img
                src={details.image}
                alt={titleName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'https://via.placeholder.com/300x450?text=No+Poster';
                }}
              />
            </div>
          ) : (
            <div className="w-44 sm:w-56 aspect-[2/3] rounded-2xl bg-surface-elevated flex items-center justify-center flex-shrink-0 border border-white/10 text-gray-500">
              <Film size={48} />
            </div>
          )}

          {/* Details Content */}
          <div className="flex-1 space-y-4 sm:space-y-5 w-full">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                  <Sparkles size={13} />
                  <span>Movierulz Scraped Release</span>
                </span>
                {details.quality && (
                  <span
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${
                      isCamOrDvdScr
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {details.quality}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-3xl font-black font-display text-white tracking-tight leading-snug">
                {titleName}
              </h1>
            </div>

            {/* Clickable Hyperlinked Metadata (Starring, Genres, Categories, Director) */}
            <div className="space-y-2 py-3 border-y border-white/10 text-xs sm:text-sm">
              {Object.keys(meta).length > 0 ? (
                Object.entries(meta).map(([key, items], idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-1.5 text-gray-300">
                    <span className="font-bold text-gray-400 text-xs mr-1">{key}:</span>
                    {items.map((item, iIdx) =>
                      item.link ? (
                        <Link
                          key={iIdx}
                          to={`/movierulz/special/${item.link}`}
                          className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-blue-500/20 hover:text-blue-300 border border-white/10 hover:border-blue-500/30 text-xs font-medium transition text-gray-200"
                        >
                          {item.name}
                        </Link>
                      ) : (
                        <span key={iIdx} className="text-gray-200 text-xs">
                          {item.name}
                          {iIdx < items.length - 1 ? ', ' : ''}
                        </span>
                      )
                    )}
                  </div>
                ))
              ) : details.info && details.info.length > 0 ? (
                details.info.map((line, idx) => (
                  <p key={idx} className="leading-relaxed text-gray-300 text-xs sm:text-sm">
                    {line}
                  </p>
                ))
              ) : null}
            </div>

            {/* Synopsis */}
            {details.desc && (
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Synopsis</h3>
                <p className="text-xs sm:text-sm text-gray-200 leading-relaxed max-w-3xl">
                  {details.desc}
                </p>
              </div>
            )}

            {/* Seedr Files Link Pill */}
            <div className="pt-2 flex items-center gap-3">
              <Link
                to="/files"
                className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 hover:underline font-semibold"
              >
                <HardDrive size={14} />
                <span>Open Seedr Cloud Files</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Available Quality Downloads (PROFESSIONAL 1-ROW ACTION BUTTONS) */}
      <div className="rounded-3xl glass-panel p-5 sm:p-8 border border-white/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Download size={18} className="text-blue-400" />
              <span>Available Torrents & Magnets ({links.length})</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Add directly to Seedr cloud storage, or launch/copy the direct magnet link.
            </p>
          </div>
        </div>

        {links.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-surface-elevated border border-white/5 space-y-2">
            <AlertCircle size={28} className="mx-auto text-amber-400" />
            <p className="text-sm font-semibold text-white">No magnet links parsed for this title</p>
            <p className="text-xs text-gray-400">The release page may not have active direct torrent download buttons.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((item, idx) => {
              const resTag = item.resolution || 'HD';
              const is1080 = resTag.includes('1080') || resTag.includes('4K');
              const is720 = resTag.includes('720');

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl bg-surface-elevated border border-white/5 hover:border-blue-500/30 transition group shadow"
                >
                  {/* File Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${
                        is1080
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : is720
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-700/40 text-gray-300 border border-white/5'
                      }`}
                    >
                      {resTag}
                    </span>

                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-bold text-white truncate block">
                        {item.name}
                      </span>
                      {item.size && (
                        <span className="text-[11px] font-semibold text-gray-400 mt-0.5 block">
                          Size: <span className="text-gray-200">{item.size}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3 Buttons in 1 Sleek Horizontal Row */}
                  <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
                    {/* Primary Action: Add to Seedr */}
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 sm:flex-none justify-center whitespace-nowrap text-xs font-bold"
                      onClick={() => addTorrentMutation.mutate(item.link)}
                      isLoading={addTorrentMutation.isPending}
                      icon={<Plus size={14} />}
                    >
                      Add to Seedr
                    </Button>

                    {/* Secondary Icon Action: Launch Magnet */}
                    <a
                      href={item.link}
                      className="w-9 h-9 rounded-xl bg-surface hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition flex items-center justify-center flex-shrink-0 shadow"
                      title="Open in Torrent Client"
                    >
                      <Magnet size={15} className="text-blue-400" />
                    </a>

                    {/* Secondary Icon Action: Copy Magnet */}
                    <button
                      onClick={() => handleCopyMagnet(item.link, idx)}
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
      </div>
    </div>
  );
};

export default MovierulzDetail;
