import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import Hls from 'hls.js';
import {
  Tv,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Radio,
  Search,
  Star,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Flame,
  Film,
  Music,
  Smile,
  GraduationCap,
  Sparkles,
  X,
  Layers,
  Cast,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import liveTvApi from '../../api/liveTv';
import { toastSuccess, toastWarning, toastError } from '../../components/ui/Notifications';

const CATEGORY_ICONS = {
  All: <Layers size={14} />,
  Favorites: <Star size={14} className="fill-amber-400 text-amber-400" />,
  Popular: <Flame size={14} className="text-orange-400" />,
  Movies: <Film size={14} className="text-pink-400" />,
  Entertainment: <Sparkles size={14} className="text-purple-400" />,
  News: <Radio size={14} className="text-red-400" />,
  Music: <Music size={14} className="text-blue-400" />,
  Sports: <Flame size={14} className="text-emerald-400" />,
  Kids: <Smile size={14} className="text-yellow-400" />,
  Religious: <Sparkles size={14} className="text-amber-400" />,
  Education: <GraduationCap size={14} className="text-indigo-400" />,
  Documentary: <Film size={14} className="text-cyan-400" />,
  General: <Tv size={14} className="text-gray-400" />,
};

export const LiveTVPage = () => {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('rsg_livetv_favorites') || '[]');
    } catch {
      return [];
    }
  });
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOpenInAppModal, setIsOpenInAppModal] = useState(false);
  const [isPlayerDrawerOpen, setIsPlayerDrawerOpen] = useState(false);
  const [playerError, setPlayerError] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Auto-hide controls after 3 seconds of inactivity when playing
  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }

    if (showControls && isPlaying && !isPlayerDrawerOpen && !isOpenInAppModal) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying, isPlayerDrawerOpen, isOpenInAppModal]);

  const handleUserActivity = () => {
    setShowControls(true);
  };

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const playerContainerRef = useRef(null);

  // Fetch Live TV channels
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['liveTvChannels'],
    queryFn: () => liveTvApi.getChannels(),
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  });

  const channels = data?.channels || [];
  const categories = data?.categories || ['All', 'Entertainment', 'Movies', 'News', 'Music', 'Sports', 'Kids', 'Religious', 'Education', 'Documentary', 'General'];

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('rsg_livetv_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (channelId, e) => {
    if (e) e.stopPropagation();
    setFavorites((prev) => {
      const exists = prev.includes(channelId);
      if (exists) {
        toastWarning('Removed from Favorites');
        return prev.filter((id) => id !== channelId);
      } else {
        toastSuccess('Added to Favorites');
        return [...prev, channelId];
      }
    });
  };

  // Select first channel automatically when channels load if none selected
  useEffect(() => {
    if (!selectedChannel && channels.length > 0) {
      setSelectedChannel(channels[0]);
    }
  }, [channels, selectedChannel]);

  // Sync fullscreen state & orientation
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isFs);
      if (!isFs && window.screen?.orientation && typeof window.screen.orientation.unlock === 'function') {
        window.screen.orientation.unlock();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      if (window.screen?.orientation && typeof window.screen.orientation.unlock === 'function') {
        window.screen.orientation.unlock();
      }
    };
  }, []);

  const [useProxy, setUseProxy] = useState(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('istream_proxy_livetv') : null;
    return saved !== null ? saved === 'true' : false; // OFF by default for Live TV
  });

  const toggleProxy = useCallback(() => {
    setUseProxy((prev) => {
      const next = !prev;
      localStorage.setItem('istream_proxy_livetv', String(next));
      return next;
    });
  }, []);

  // HLS Stream Playback lifecycle
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedChannel?.url) return;

    setPlayerError(null);
    setIsPlaying(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const rawUrl = selectedChannel.url;
    const streamUrl = useProxy
      ? (rawUrl.includes('/react/livetv/proxy/') ? rawUrl : `/react/livetv/proxy/?url=${encodeURIComponent(rawUrl)}`)
      : rawUrl;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          // Autoplay policy might require mute
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setPlayerError('Stream is temporarily offline or inaccessible from this location.');
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS for Safari/iOS
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        setPlayerError('Stream playback error. Try an external player like VLC.');
      });
    } else {
      setPlayerError('HLS playback is not supported on this browser.');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedChannel]);

  // Filter channels by Category, Favorites, and Search query
  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      // Favorites filter
      if (selectedCategory === 'Favorites') {
        if (!favorites.includes(channel.id)) return false;
      } else if (selectedCategory !== 'All') {
        if (channel.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = channel.name?.toLowerCase().includes(q);
        const matchCat = channel.category?.toLowerCase().includes(q);
        const matchGroup = channel.group?.toLowerCase().includes(q);
        return matchName || matchCat || matchGroup;
      }

      return true;
    });
  }, [channels, selectedCategory, searchQuery, favorites]);

  // Copy Stream Link
  const handleCopyLink = () => {
    if (!selectedChannel?.url) return;
    navigator.clipboard.writeText(selectedChannel.url);
    setCopiedUrl(true);
    toastSuccess('Live stream URL copied to clipboard!');
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Fullscreen Toggle with mobile landscape auto-lock
  const toggleFullscreen = useCallback(async () => {
    const container = playerContainerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        } else if (videoRef.current?.webkitEnterFullscreen) {
          videoRef.current.webkitEnterFullscreen();
        }
        setIsFullscreen(true);
        // Mobile direct landscape lock
        if (window.screen?.orientation && typeof window.screen.orientation.lock === 'function') {
          window.screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        setIsFullscreen(false);
        if (window.screen?.orientation && typeof window.screen.orientation.unlock === 'function') {
          window.screen.orientation.unlock();
        }
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  }, []);

  // Keyboard Shortcuts ('F' / 'f' for fullscreen, Space for play/pause, 'M' for mute)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore shortcut if user is typing in search bar or input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target?.isContentEditable
      ) {
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.muted = !videoRef.current.muted;
          setIsMuted(videoRef.current.muted);
        }
      } else if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play().then(() => {
              setIsPlaying(true);
              setShowControls(true);
            }).catch(() => {});
          } else {
            videoRef.current.pause();
            setIsPlaying(false);
            setShowControls(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleFullscreen]);

  // Cast Handler
  const handleCast = () => {
    const video = videoRef.current;
    setIsOpenInAppModal(false);
    if (video && video.remote && typeof video.remote.prompt === 'function') {
      video.remote.prompt().catch(() => {});
    } else if (video && video.webkitShowPlaybackTargetPicker) {
      try {
        video.webkitShowPlaybackTargetPicker();
      } catch (e) {}
    } else {
      toastSuccess('Cast: Ensure Chromecast or Smart TV is on the same Wi-Fi network.');
    }
  };

  // VLC Launch
  const handleOpenVlc = (e) => {
    if (e) e.preventDefault();
    if (!selectedChannel?.url) return;
    setIsOpenInAppModal(false);
    const url = selectedChannel.url;
    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isAndroid) {
      window.location.href = `intent:${url}#Intent;package=org.videolan.vlc;type=video/*;end`;
    } else if (isIOS) {
      window.location.href = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(url)}`;
    } else {
      // Desktop: Download .m3u playlist for 1-click launch in VLC / Media Player
      try {
        const streamTitle = (selectedChannel.name || 'LiveTV').replace(/[\r\n]/g, ' ');
        const m3uContent = `#EXTM3U\n#EXTINF:-1,${streamTitle}\n${url}\n`;
        const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${streamTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || 'livetv'}.m3u`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        toastSuccess('M3U playlist downloaded for VLC!');
      } catch (err) {
        window.location.href = `vlc://${url}`;
      }
    }
  };

  const isCurrentFavorite = selectedChannel && favorites.includes(selectedChannel.id);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <Radio size={22} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight flex items-center gap-2">
                Live TV Channels
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-600 text-white animate-pulse">
                  LIVE
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Stream 740+ Indian Television Channels in high definition directly in your browser.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Refresh & Stats */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-white/10 text-gray-300 hover:text-white border border-white/5 transition flex items-center justify-center gap-2 text-xs font-semibold"
            title="Refresh channels from source"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin text-blue-400' : ''} />
            <span>{isFetching ? 'Syncing...' : 'Sync Channels'}</span>
          </button>
          <span className="px-3 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold">
            {channels.length} Channels
          </span>
        </div>
      </div>

      {/* Main Player & Interactive Theater View */}
      {selectedChannel && (
        <div className="space-y-3">
          <div
            ref={playerContainerRef}
            onMouseMove={handleUserActivity}
            onTouchStart={handleUserActivity}
            onTouchMove={handleUserActivity}
            onMouseLeave={() => isPlaying && !isPlayerDrawerOpen && !isOpenInAppModal && setShowControls(false)}
            className={`relative bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl transition-all flex flex-col justify-center select-none group ${
              isFullscreen
                ? 'fixed inset-0 z-[99999] rounded-none border-none max-h-none h-screen w-screen'
                : 'w-full aspect-video max-h-[72vh]'
            } ${!showControls && isPlaying ? 'cursor-none' : ''}`}
          >
            {/* Video Element */}
            <video
              ref={videoRef}
              className={`w-full h-full object-contain ${isFullscreen ? 'max-h-screen' : ''}`}
              playsInline
              autoPlay
              controls={false}
              onClick={(e) => {
                e.stopPropagation();
                if (!showControls) {
                  setShowControls(true);
                } else if (videoRef.current) {
                  if (videoRef.current.paused) {
                    videoRef.current.play();
                    setIsPlaying(true);
                    setShowControls(true);
                  } else {
                    videoRef.current.pause();
                    setIsPlaying(false);
                    setShowControls(true);
                  }
                }
              }}
            />

            {/* Error Message Overlay */}
            {playerError && (
              <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 space-y-3">
                <div className="w-14 h-14 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center text-2xl">
                  ⚠️
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white">Playback Interrupted</h3>
                <p className="text-xs sm:text-sm text-gray-300 max-w-md">{playerError}</p>
                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      setPlayerError(null);
                      refetch();
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <RefreshCw size={14} /> Retry
                  </button>
                  <button
                    onClick={(e) => handleOpenVlc(e)}
                    className="px-4 py-2 rounded-xl bg-orange-600/80 hover:bg-orange-600 text-white text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    Open in VLC
                  </button>
                </div>
              </div>
            )}

            {/* Top Bar Overlay (Channel Title in Fullscreen) */}
            {isFullscreen && (
              <div
                className={`absolute top-4 left-4 right-4 flex items-center justify-between z-20 transition-all duration-300 pointer-events-none ${
                  showControls || !isPlaying
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 -translate-y-2'
                }`}
              >
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-white text-xs font-semibold shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="line-clamp-1">{selectedChannel.name}</span>
                </div>
              </div>
            )}

            {/* Bottom Floating Control Bar */}
            <div
              className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-between transition-all duration-300 z-20 ${
                showControls || !isPlaying
                  ? 'opacity-100 pointer-events-auto translate-y-0'
                  : 'opacity-0 pointer-events-none translate-y-2'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Play / Pause */}
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      if (videoRef.current.paused) {
                        videoRef.current.play();
                        setIsPlaying(true);
                        setShowControls(true);
                      } else {
                        videoRef.current.pause();
                        setIsPlaying(false);
                        setShowControls(true);
                      }
                    }
                  }}
                  className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition backdrop-blur-sm"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>

                {/* Mute / Unmute */}
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !videoRef.current.muted;
                      setIsMuted(videoRef.current.muted);
                    }
                  }}
                  className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition backdrop-blur-sm"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                {/* Current Channel Info */}
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-bold text-white leading-none line-clamp-1">{selectedChannel.name}</p>
                  <p className="text-[11px] text-gray-400">{selectedChannel.category} Channel</p>
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2">
                {/* Favorite Button */}
                <button
                  onClick={(e) => toggleFavorite(selectedChannel.id, e)}
                  className={`p-2 rounded-xl transition backdrop-blur-sm ${
                    isCurrentFavorite
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-400/30'
                      : 'bg-white/15 hover:bg-white/25 text-gray-300 hover:text-white'
                  }`}
                  title={isCurrentFavorite ? 'Remove Favorite' : 'Add to Favorites'}
                >
                  <Star size={18} className={isCurrentFavorite ? 'fill-amber-400' : ''} />
                </button>

                {/* Channel Switcher Drawer Toggle */}
                <button
                  onClick={() => setIsPlayerDrawerOpen(!isPlayerDrawerOpen)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition backdrop-blur-sm flex items-center gap-1.5 ${
                    isPlayerDrawerOpen
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/15 hover:bg-white/25 text-gray-200'
                  }`}
                  title="Channel Drawer"
                >
                  <Tv size={15} />
                  <span className="hidden sm:inline">Channels</span>
                </button>

                {/* Fullscreen with Mobile Landscape Lock */}
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition backdrop-blur-sm"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
              </div>
            </div>

            {/* In-Player Side Drawer for Quick Channel Switching */}
            {isPlayerDrawerOpen && (
              <div className="absolute top-0 right-0 bottom-0 w-80 max-w-[85%] bg-darkbg/95 backdrop-blur-xl border-l border-white/10 z-30 flex flex-col p-4 animate-fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Tv size={16} className="text-blue-400" />
                    Switch Channel
                  </h4>
                  <button
                    onClick={() => setIsPlayerDrawerOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 py-3 pr-1">
                  {filteredChannels.slice(0, 100).map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setSelectedChannel(ch);
                        setIsPlayerDrawerOpen(false);
                      }}
                      className={`w-full p-2.5 rounded-xl text-left flex items-center gap-3 transition ${
                        selectedChannel?.id === ch.id
                          ? 'bg-blue-600/30 text-white border border-blue-500/40'
                          : 'bg-surface-elevated hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      {ch.logo ? (
                        <img
                          src={ch.logo}
                          alt={ch.name}
                          className="w-7 h-7 object-contain rounded bg-black/40 p-0.5 flex-shrink-0"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-surface text-gray-400 flex items-center justify-center flex-shrink-0">
                          <Tv size={14} />
                        </div>
                      )}
                      <div className="truncate flex-1">
                        <p className="text-xs font-semibold truncate">{ch.name}</p>
                        <p className="text-[10px] text-gray-400">{ch.category}</p>
                      </div>
                      <span className="text-[10px] text-blue-400 font-mono font-semibold">
                        {ch.quality || 'HD'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Under-Player Metadata Row */}
          <div className="p-4 sm:p-5 bg-surface-card rounded-2xl flex items-center justify-between gap-4 border border-white/5">
            <div className="flex items-center gap-3.5">
              {selectedChannel.logo ? (
                <img
                  src={selectedChannel.logo}
                  alt={selectedChannel.name}
                  className="w-12 h-12 object-contain rounded-2xl bg-black/50 p-1.5 border border-white/10 shadow flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center flex-shrink-0">
                  <Tv size={22} />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white truncate leading-tight">{selectedChannel.name}</h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-lg bg-blue-600/25 text-blue-400 border border-blue-500/30">
                    {selectedChannel.category}
                  </span>
                  <span className="px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
                    {selectedChannel.quality || 'HD'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stream Actions: Open in App (Contains VLC, MX Player, PotPlayer, Cast, Copy) */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsOpenInAppModal(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-lg shadow-blue-500/20 flex items-center gap-1.5"
              >
                <Tv size={15} />
                <span>Open in App</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open in App Modal / Sheet */}
      {isOpenInAppModal && selectedChannel && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setIsOpenInAppModal(false)}
        >
          <div
            className="w-full sm:max-w-md bg-darkbg border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Tv size={18} className="text-blue-400" />
                <h3 className="text-base font-bold text-white">Open in External App</h3>
              </div>
              <button
                onClick={() => setIsOpenInAppModal(false)}
                className="p-1.5 rounded-full bg-surface-elevated text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Stream <strong className="text-white">{selectedChannel.name}</strong> on VLC, MX Player, PotPlayer, or Chromecast with native hardware acceleration.
            </p>

            <div className="space-y-2 pt-1">
              {/* VLC Player */}
              <button
                onClick={(e) => handleOpenVlc(e)}
                className="w-full text-left p-3 rounded-2xl bg-surface-card hover:bg-surface-elevated border border-white/5 hover:border-orange-500/40 transition flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-base flex-shrink-0">
                  V
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold block text-white text-sm">VLC Media Player</span>
                  <span className="text-[11px] text-gray-400">Mobile Intent / Desktop Playlist</span>
                </div>
                <ChevronRight size={16} className="text-gray-500" />
              </button>

              {/* MX Player */}
              <a
                href={`intent:${selectedChannel.url}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;end`}
                onClick={() => setIsOpenInAppModal(false)}
                className="w-full text-left p-3 rounded-2xl bg-surface-card hover:bg-surface-elevated border border-white/5 hover:border-blue-500/40 transition flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-base flex-shrink-0">
                  M
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold block text-white text-sm">MX Player</span>
                  <span className="text-[11px] text-gray-400">Android native hardware acceleration</span>
                </div>
                <ChevronRight size={16} className="text-gray-500" />
              </a>

              {/* PotPlayer / KMPlayer */}
              <a
                href={`potplayer://${selectedChannel.url}`}
                onClick={() => setIsOpenInAppModal(false)}
                className="w-full text-left p-3 rounded-2xl bg-surface-card hover:bg-surface-elevated border border-white/5 hover:border-yellow-500/40 transition flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-black text-base flex-shrink-0">
                  P
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold block text-white text-sm">PotPlayer / KMPlayer</span>
                  <span className="text-[11px] text-gray-400">Windows desktop media player</span>
                </div>
                <ChevronRight size={16} className="text-gray-500" />
              </a>

              {/* Cast */}
              <button
                onClick={handleCast}
                className="w-full text-left p-3 rounded-2xl bg-surface-card hover:bg-surface-elevated border border-white/5 hover:border-emerald-500/40 transition flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Cast size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold block text-white text-sm">Cast to TV / Chromecast</span>
                  <span className="text-[11px] text-gray-400">AirPlay & Google Cast stream prompt</span>
                </div>
                <ChevronRight size={16} className="text-gray-500" />
              </button>

              {/* Copy Stream Link */}
              <button
                onClick={handleCopyLink}
                className="w-full text-left p-3 rounded-2xl bg-surface-card hover:bg-surface-elevated border border-white/5 transition flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 text-gray-300 flex items-center justify-center flex-shrink-0">
                  {copiedUrl ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold block text-white text-sm">
                    {copiedUrl ? 'Copied Stream URL' : 'Copy Direct Stream URL'}
                  </span>
                  <span className="text-[11px] text-gray-400">Paste in Kodi, IINA, or VLC</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar Section */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 740+ channels by name (e.g. NDTV, Aaj Tak, 9X Music, Star, Zee)..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl bg-surface-card border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white rounded-lg"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {/* Favorites Pill */}
          <button
            onClick={() => setSelectedCategory('Favorites')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all shadow-sm ${
              selectedCategory === 'Favorites'
                ? 'bg-amber-500 text-black shadow-amber-500/20 font-bold'
                : 'bg-surface-card text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Star size={14} className={selectedCategory === 'Favorites' ? 'fill-black' : 'fill-amber-400 text-amber-400'} />
            <span>Favorites</span>
            {favorites.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedCategory === 'Favorites' ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-300'
              }`}>
                {favorites.length}
              </span>
            )}
          </button>

          {/* All & Other Categories */}
          {categories.map((cat) => {
            const isCatActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all shadow-sm ${
                  isCatActive
                    ? 'bg-blue-600 text-white shadow-blue-500/20 font-bold'
                    : 'bg-surface-card text-gray-300 hover:text-white hover:bg-white/10 border border-white/5'
                }`}
              >
                {CATEGORY_ICONS[cat] || <Tv size={14} />}
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Channels Grid View */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 18 }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-[4/3] rounded-2xl bg-surface-card animate-pulse border border-white/5 p-4 flex flex-col justify-between"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 mx-auto"></div>
              <div className="space-y-1.5">
                <div className="h-3.5 bg-white/10 rounded w-3/4 mx-auto"></div>
                <div className="h-2.5 bg-white/5 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredChannels.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-surface-card border border-white/5 space-y-3">
          <div className="w-16 h-16 rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto text-2xl">
            <Radio size={28} />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white">No channels found</h3>
          <p className="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto">
            {selectedCategory === 'Favorites'
              ? 'You have not added any channels to your Favorites yet. Click the star icon on any channel to bookmark it!'
              : 'Try searching with different keywords or choosing another category.'}
          </p>
          {selectedCategory !== 'All' && (
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
            >
              View All Channels
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>Showing {filteredChannels.length} channels</span>
            {searchQuery && (
              <span className="text-blue-400 font-medium">Filtered by: "{searchQuery}"</span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filteredChannels.map((channel) => {
              const isSelected = selectedChannel?.id === channel.id;
              const isFav = favorites.includes(channel.id);

              return (
                <div
                  key={channel.id}
                  onClick={() => {
                    setSelectedChannel(channel);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500 -translate-y-1'
                      : 'bg-surface-card hover:bg-surface-elevated border-white/5 hover:border-blue-500/40 hover:-translate-y-1 hover:shadow-lg'
                  }`}
                >
                  {/* Top Badges: Favorite & Quality */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-black/60 text-blue-400 border border-white/10">
                      {channel.quality || 'HD'}
                    </span>
                    <button
                      onClick={(e) => toggleFavorite(channel.id, e)}
                      className={`p-1 rounded-lg transition ${
                        isFav
                          ? 'text-amber-400 hover:text-amber-300'
                          : 'text-gray-500 hover:text-white opacity-40 group-hover:opacity-100'
                      }`}
                      title={isFav ? 'Remove Favorite' : 'Add to Favorites'}
                    >
                      <Star size={14} className={isFav ? 'fill-amber-400' : ''} />
                    </button>
                  </div>

                  {/* Logo / Thumbnail */}
                  <div className="h-16 flex items-center justify-center my-1 relative">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={channel.name}
                        loading="lazy"
                        className="max-h-14 max-w-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-surface-elevated text-gray-500 flex items-center justify-center group-hover:text-blue-400 transition-colors">
                        <Tv size={24} />
                      </div>
                    )}
                  </div>

                  {/* Channel Title & Category */}
                  <div className="text-center mt-2">
                    <p className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                      {channel.name}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">
                      {channel.category}
                    </p>
                  </div>

                  {/* Hover Play Prompt Overlay */}
                  <div className="absolute inset-0 bg-blue-600/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                      <Play size={14} className="fill-white ml-0.5" />
                    </div>
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

export default LiveTVPage;
