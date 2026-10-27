import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Download,
  Youtube as YoutubeIcon,
  Music,
  Video,
  Sparkles,
  Search,
  X,
  Play,
  Eye,
  Clock,
  User,
  ListVideo,
  Copy,
  Check,
  Film,
} from 'lucide-react';
import youtubeApi from '../../api/youtube';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import { toastSuccess, toastError } from '../../components/ui/Notifications';

export const YoutubeDownloader = () => {
  const [urlInput, setUrlInput] = useState('');
  const [activeUrl, setActiveUrl] = useState('');
  const [isPlayingEmbed, setIsPlayingEmbed] = useState(false);
  const [activeTab, setActiveTab] = useState('video'); // 'video', 'audio'
  const [copiedFormatId, setCopiedFormatId] = useState(null);
  const [playlistSearch, setPlaylistSearch] = useState('');

  // Fetch YouTube Metadata, Formats, or Playlist
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['youtubeMeta', activeUrl],
    queryFn: () => youtubeApi.getYoutubeInfo(activeUrl),
    enabled: Boolean(activeUrl),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const handleFetch = (e) => {
    if (e) e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;
    setActiveUrl(cleanUrl);
    setIsPlayingEmbed(false);
  };

  const handleSelectPlaylistItem = (itemUrl) => {
    setUrlInput(itemUrl);
    setActiveUrl(itemUrl);
    setIsPlayingEmbed(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyLink = (f, key) => {
    const titleClean = (data?.title || 'video').replace(/[^\w\s.-]/g, '').trim().substring(0, 60);
    const fileExt = (f.ext || 'mp4').toLowerCase();
    const filename = `${titleClean}_${f.resolution || f.quality || 'media'}.${fileExt}`;
    const baseUrl = window.location.origin + (import.meta.env.VITE_API_URL || '');
    let directStreamUrl = `${baseUrl}/react/youtube/stream/?id=${encodeURIComponent(data?.id || '')}&format_id=${encodeURIComponent(f.format_id || '')}&ext=${encodeURIComponent(fileExt)}&filename=${encodeURIComponent(filename)}`;
    if (f.url) {
      directStreamUrl += `&url=${encodeURIComponent(f.url)}`;
    }
    navigator.clipboard.writeText(directStreamUrl);
    setCopiedFormatId(key);
    toastSuccess('Direct download link copied to clipboard!');
    setTimeout(() => setCopiedFormatId(null), 2500);
  };

  const handleDownloadFormat = (f, isAudio = false) => {
    const titleClean = (data?.title || 'video').replace(/[^\w\s.-]/g, '').trim().substring(0, 60);
    const fileExt = (f.ext || (isAudio ? 'm4a' : 'mp4')).toLowerCase();
    const filename = `${titleClean}_${f.resolution || f.quality || 'media'}.${fileExt}`;

    const baseUrl = import.meta.env.VITE_API_URL || '';
    let downloadUrl = `${baseUrl}/react/youtube/stream/?id=${encodeURIComponent(data?.id || '')}&format_id=${encodeURIComponent(f.format_id || '')}&ext=${encodeURIComponent(fileExt)}&filename=${encodeURIComponent(filename)}`;
    if (f.url) {
      downloadUrl += `&url=${encodeURIComponent(f.url)}`;
    }

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toastSuccess(`Starting ${f.quality || ''} download...`);
  };

  const isPlaylist = data?.is_playlist === true;
  const playlistEntries = data?.entries || [];
  const filteredPlaylistEntries = playlistEntries.filter((e) =>
    !playlistSearch ? true : (e.title || '').toLowerCase().includes(playlistSearch.toLowerCase())
  );

  const videoFormats = data?.video_formats || [];
  const audioFormats = data?.audio_formats || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in max-w-5xl mx-auto pb-24 px-2 sm:px-0">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/20 text-red-400 text-xs font-bold mb-2">
            <YoutubeIcon size={14} />
            <span>Direct Stream & Playlist Extractor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
            YouTube & Media Downloader
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Extract direct unthrottled 4K, 1080p, 720p video downloads, audio tracks, or full playlists with zero server storage.
          </p>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleFetch} className="flex gap-2 max-w-md w-full">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste YouTube video or playlist URL..."
            icon={<Search size={16} />}
          />
          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={isLoading}
            className="font-bold flex-shrink-0 bg-red-600 hover:bg-red-500 text-white"
          >
            Extract
          </Button>
        </form>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="rounded-3xl glass-panel p-8 border border-white/10 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-gray-300">
            Extracting 4K, 1080p, 720p streams, audio tracks, and playlist items...
          </p>
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <ErrorState
          onRetry={refetch}
          message={
            error?.response?.data?.error ||
            'Could not extract media details from this URL. Please verify the link is public and retry.'
          }
        />
      )}

      {/* 1. PLAYLIST VIEW */}
      {data && isPlaylist && !isLoading && (
        <div className="space-y-6 animate-fade-in">
          {/* Playlist Header Card */}
          <div className="relative rounded-3xl glass-panel p-6 sm:p-8 border border-white/10 overflow-hidden shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/20 text-red-400 text-xs font-bold">
                  <ListVideo size={13} />
                  <span>YouTube Playlist</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">{data.title}</h2>
                {data.uploader && (
                  <p className="text-xs text-gray-400 font-semibold flex items-center gap-1.5">
                    <User size={13} />
                    <span>Channel: {data.uploader}</span>
                  </p>
                )}
              </div>

              <div className="px-4 py-2 rounded-2xl bg-surface-elevated border border-white/5 text-center flex-shrink-0">
                <span className="text-xl font-black text-white">{data.total_items}</span>
                <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Videos</span>
              </div>
            </div>

            {/* Filter inside playlist */}
            <div className="pt-2">
              <Input
                value={playlistSearch}
                onChange={(e) => setPlaylistSearch(e.target.value)}
                placeholder="Filter videos in this playlist..."
                icon={<Search size={15} />}
              />
            </div>
          </div>

          {/* Playlist Video Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPlaylistEntries.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleSelectPlaylistItem(item.url)}
                className="group rounded-2xl overflow-hidden glass-panel border border-white/5 hover:border-red-500/40 p-3 flex flex-col justify-between transition hover:-translate-y-1 duration-200 cursor-pointer shadow hover:shadow-xl"
              >
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-surface mb-2.5 relative">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/320x180?text=YouTube+Video';
                    }}
                  />
                  {item.duration_str && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] font-bold text-gray-200 border border-white/10">
                      {item.duration_str}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white line-clamp-2 group-hover:text-red-400 leading-snug">
                    {item.title}
                  </h4>
                  {item.uploader && (
                    <p className="text-[10px] text-gray-400 truncate">{item.uploader}</p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-bold text-red-400 group-hover:text-red-300">
                  <span>Extract Downloads</span>
                  <Download size={13} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. SINGLE VIDEO VIEW */}
      {data && !isPlaylist && !isLoading && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
          {/* Main Video Hero Card */}
          <div className="relative rounded-3xl glass-panel p-5 sm:p-8 border border-white/10 overflow-hidden shadow-2xl">
            <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start">
              {/* Thumbnail / Player Preview */}
              <div className="w-full md:w-80 aspect-video rounded-2xl overflow-hidden bg-surface flex-shrink-0 shadow-2xl border border-white/10 relative">
                {isPlayingEmbed && data.embed_url ? (
                  <iframe
                    src={`${data.embed_url}?autoplay=1`}
                    title={data.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <>
                    <img
                      src={data.thumbnail}
                      alt={data.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/480x270?text=YouTube+Video';
                      }}
                    />
                    <button
                      onClick={() => setIsPlayingEmbed(true)}
                      className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition border border-white/20 backdrop-blur-sm"
                      title="Play Preview"
                    >
                      <Play size={24} className="ml-1 fill-white" />
                    </button>
                    {data.duration_str && (
                      <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/80 backdrop-blur-sm text-xs font-bold text-white border border-white/10">
                        {data.duration_str}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Video Info Details */}
              <div className="flex-1 space-y-4 w-full">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/10 border border-red-500/20 text-red-400 text-xs font-bold">
                    <Video size={13} />
                    <span>YouTube Verified Video</span>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-black font-display text-white tracking-tight leading-snug">
                    {data.title}
                  </h2>
                </div>

                {/* Metrics Bar */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 py-2 border-y border-white/10">
                  {data.uploader && (
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <User size={14} className="text-red-400" />
                      <span>{data.uploader}</span>
                    </div>
                  )}
                  {data.duration_str && (
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-gray-400" />
                      <span>Duration: {data.duration_str}</span>
                    </div>
                  )}
                  {data.view_count && (
                    <div className="flex items-center gap-1.5">
                      <Eye size={14} className="text-gray-400" />
                      <span>{Number(data.view_count).toLocaleString()} views</span>
                    </div>
                  )}
                </div>

                {/* Watch Embed Toggle */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setIsPlayingEmbed(!isPlayingEmbed)}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-200 border border-white/10 transition"
                  >
                    <Play size={13} className="text-red-400" />
                    <span>{isPlayingEmbed ? 'Hide Watch Player' : 'Watch Online Preview'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Download Formats Section */}
          <div className="rounded-3xl glass-panel p-5 sm:p-8 border border-white/10 space-y-6 shadow-2xl">
            {/* Format Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('video')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'video'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/25'
                      : 'bg-surface hover:bg-white/10 text-gray-300 border border-white/5'
                  }`}
                >
                  <Video size={14} />
                  <span>Video Downloads ({videoFormats.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('audio')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'audio'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/25'
                      : 'bg-surface hover:bg-white/10 text-gray-300 border border-white/5'
                  }`}
                >
                  <Music size={14} />
                  <span>Audio Tracks ({audioFormats.length})</span>
                </button>
              </div>
            </div>

            {/* 1. Video Formats List (4K, 1080p, 720p, 480p, 360p) */}
            {activeTab === 'video' && (
              <div className="space-y-3">
                {videoFormats.length === 0 ? (
                  <EmptyState
                    title="No Video Streams"
                    message="Video streams could not be extracted for this URL."
                  />
                ) : (
                  <>
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center justify-between">
                      <span>💡 <strong>Tip:</strong> Formats labeled <strong>Full Video + Sound</strong> contain pre-muxed audio. High-definition 4K & 1080p tracks deliver pure maximum clarity.</span>
                    </div>

                    {videoFormats.map((f, idx) => {
                      const is4K = (f.quality || '').includes('4K') || (f.quality || '').includes('2160');
                      const is1080 = (f.quality || '').includes('1080');
                      const is720 = (f.quality || '').includes('720');
                      const formatKey = `video_${idx}`;

                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl bg-surface-elevated border border-white/5 hover:border-red-500/30 transition group shadow"
                        >
                          {/* Format Info */}
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
                              {f.resolution || 'HD'}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-bold text-white truncate block">
                                  {f.quality} ({f.ext})
                                </span>
                                {f.has_audio ? (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex-shrink-0">
                                    🔊 Sound Included
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 flex-shrink-0">
                                    🎬 Video Track
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-semibold text-gray-400 mt-0.5 block">
                                File Size: <strong className="text-gray-200">{f.size}</strong> • {f.note} {f.fps ? `• ${f.fps} FPS` : ''}
                              </span>
                            </div>
                          </div>

                          {/* 1-Row Action Buttons */}
                          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
                            {/* Direct Download Button */}
                            <Button
                              variant="primary"
                              size="sm"
                              className="flex-1 sm:flex-none justify-center whitespace-nowrap text-xs font-bold bg-red-600 hover:bg-red-500 text-white"
                              onClick={() => handleDownloadFormat(f, false)}
                              icon={<Download size={14} />}
                            >
                              Download {f.resolution} {f.ext}
                            </Button>

                            {/* Copy Direct Link */}
                            <button
                              onClick={() => handleCopyLink(f, formatKey)}
                              className="w-9 h-9 rounded-xl bg-surface hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition flex items-center justify-center flex-shrink-0 shadow"
                              title="Copy Direct Video Link"
                            >
                              {copiedFormatId === formatKey ? (
                                <Check size={15} className="text-emerald-400" />
                              ) : (
                                <Copy size={15} />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* 2. Audio Formats List */}
            {activeTab === 'audio' && (
              <div className="space-y-3">
                {audioFormats.length === 0 ? (
                  <EmptyState title="No Audio Streams Found" message="Audio streams could not be isolated." />
                ) : (
                  audioFormats.map((f, idx) => {
                    const formatKey = `audio_${idx}`;
                    return (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 rounded-2xl bg-surface-elevated border border-white/5 hover:border-red-500/30 transition group shadow"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                            <Music size={15} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <span className="text-xs sm:text-sm font-bold text-white truncate block">
                              Audio Track ({f.ext}) - {f.quality}
                            </span>
                            <span className="text-[11px] font-semibold text-gray-400 mt-0.5 block">
                              Bitrate: <strong className="text-gray-200">{f.quality}</strong> • File Size: {f.size}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1 sm:flex-none justify-center whitespace-nowrap text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white"
                            onClick={() => handleDownloadFormat(f, true)}
                            icon={<Download size={14} />}
                          >
                            Download Audio ({f.ext})
                          </Button>

                          <button
                            onClick={() => handleCopyLink(f, formatKey)}
                            className="w-9 h-9 rounded-xl bg-surface hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition flex items-center justify-center flex-shrink-0 shadow"
                            title="Copy Direct Audio Link"
                          >
                            {copiedFormatId === formatKey ? (
                              <Check size={15} className="text-emerald-400" />
                            ) : (
                              <Copy size={15} />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Initial Landing View when no URL is entered */}
      {!activeUrl && (
        <div className="rounded-3xl glass-panel p-8 sm:p-12 text-center border border-white/10 space-y-4 max-w-xl mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto shadow-inner">
            <YoutubeIcon size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-white">Direct Media Downloader</h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Paste any YouTube video, Shorts, or full Playlist link above to extract fast direct download links in 4K, 1080p, 720p, 480p, and audio tracks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default YoutubeDownloader;
