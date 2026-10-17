import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Copy,
  Check,
  Download,
  ExternalLink,
  Sparkles,
  HardDrive,
  AlertCircle,
  Magnet,
  Maximize2,
  X,
  Globe,
} from 'lucide-react';
import scrapersApi from '../../api/scrapers';
import seedrApi from '../../api/seedr';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import { toastSuccess, toastWarning, toastError } from '../../components/ui/Notifications';

export const TamilmvDetail = () => {
  const [searchParams] = useSearchParams();
  const link = searchParams.get('link') || '';
  const navigate = useNavigate();

  const [copiedIndex, setCopiedIndex] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tamilmvMovie', link],
    queryFn: () => scrapersApi.getTamilmvMovie(link),
    enabled: Boolean(link),
  });

  const addTorrentMutation = useMutation({
    mutationFn: (torrentLink) => seedrApi.addTorrent(torrentLink),
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

  const handleCopyMagnet = (magnetLink, idx) => {
    navigator.clipboard.writeText(magnetLink);
    setCopiedIndex(idx);
    toastSuccess('Magnet link copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-400 font-semibold">Parsing TamilMV release thread and magnets...</p>
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={refetch} message="Could not load TamilMV item details." />;
  }

  const title = data.title || data?.details?.name || 'TamilMV Release';
  const links = data.links || [];
  const images = data.images || [];

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

      {/* Main Release Header Card */}
      <div className="rounded-3xl glass-panel p-5 sm:p-8 border border-white/10 space-y-4 shadow-2xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
          <Sparkles size={13} />
          <span>1TamilMV Forum Release</span>
        </div>

        <h1 className="text-xl sm:text-3xl font-black font-display text-white tracking-tight leading-snug">
          {title}
        </h1>

        <div className="flex items-center gap-3 pt-2">
          <Link
            to="/files"
            className="inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 hover:underline font-semibold"
          >
            <HardDrive size={14} />
            <span>Open Seedr Cloud Files</span>
          </Link>
        </div>
      </div>

      {/* Downloads & Direct Links Section (1-ROW ACTIONS) */}
      <div className="rounded-3xl glass-panel p-5 sm:p-8 border border-white/10 space-y-5">
        <div className="border-b border-white/10 pb-4">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <Download size={18} className="text-emerald-400" />
            <span>Available Downloads & Direct Links ({links.length})</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Add to Seedr cloud, open high-speed direct link, or launch magnet download.
          </p>
        </div>

        {links.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-surface-elevated border border-white/5 space-y-2">
            <AlertCircle size={28} className="mx-auto text-amber-400" />
            <p className="text-sm font-semibold text-white">No active download links found in this thread</p>
            <p className="text-xs text-gray-400">The forum post may require external mirror access.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((item, idx) => {
              const resTag = item.resolution || 'HD';
              const is1080 = resTag.includes('1080');
              const is720 = resTag.includes('720');

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl bg-surface-elevated border border-white/5 hover:border-emerald-500/30 transition group shadow"
                >
                  {/* Item Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex-shrink-0 ${
                        is1080
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : is720
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
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

                  {/* 1-Row Action Buttons */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
                    {/* Primary Action: Seedr */}
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 sm:flex-none justify-center whitespace-nowrap text-xs font-bold px-2.5 sm:px-3"
                      onClick={() => addTorrentMutation.mutate(item.link)}
                      isLoading={addTorrentMutation.isPending}
                      icon={<Plus size={13} />}
                    >
                      Seedr
                    </Button>

                    {/* [Direct Link] Button (e.g. Cyberloom fast link) */}
                    {item.direct_link && (
                      <a
                        href={item.direct_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 sm:px-2.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1 shadow whitespace-nowrap flex-shrink-0"
                        title="Open Direct Download Link"
                      >
                        <Globe size={13} />
                        <span>Direct</span>
                      </a>
                    )}

                    {/* Magnet Launch Icon */}
                    <a
                      href={item.link}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-surface hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition flex items-center justify-center flex-shrink-0 shadow"
                      title="Open in Torrent Client"
                    >
                      <Magnet size={14} className="text-emerald-400" />
                    </a>

                    {/* Copy Magnet Icon */}
                    <button
                      onClick={() => handleCopyMagnet(item.link, idx)}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-surface hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition flex items-center justify-center flex-shrink-0 shadow"
                      title="Copy Magnet Link"
                    >
                      {copiedIndex === idx ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Screenshots Gallery with Lightbox Modal */}
      {images.length > 0 && (
        <div className="rounded-3xl glass-panel p-5 sm:p-8 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-gray-300 uppercase tracking-wider">
              Release Screenshots & Artwork ({images.length})
            </h2>
            <span className="text-[11px] text-gray-400 font-medium">Click image for full view</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[55vh] overflow-y-auto pr-1 no-scrollbar">
            {images.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedImage(img.link)}
                className="group relative rounded-xl overflow-hidden bg-surface border border-white/5 shadow-md aspect-video cursor-pointer"
              >
                <img
                  src={img.link}
                  alt={`Screenshot ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Maximize2 size={24} className="text-white drop-shadow" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-surface-elevated text-gray-300 hover:text-white border border-white/10 transition z-10"
          >
            <X size={20} />
          </button>
          <img
            src={selectedImage}
            alt="Full Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default TamilmvDetail;
