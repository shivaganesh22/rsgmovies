import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import dashjs from 'dashjs';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings,
  Download,
  ExternalLink,
  Copy,
  Check,
  Tv,
  PictureInPicture2,
  Sliders,
  X,
} from 'lucide-react';
import { toastSuccess, toastWarning } from '../ui/Notifications';
import { getProxiedStreamUrl, getProxiedDownloadUrl, MOVIEBOX_PROXY_BASE } from '../../api/moviebox';

export const MovieboxPlayer = ({
  stream,
  streams = [],
  title = 'Moviebox Stream',
  poster = '',
  onStreamChange,
  proxyBase = MOVIEBOX_PROXY_BASE,
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressContainerRef = useRef(null);
  const hlsRef = useRef(null);
  const dashRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null); // 'streams' | 'apps' | 'settings' | 'speed'
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [copiedType, setCopiedType] = useState(null);

  // Resolve proxied URL for browser playback
  const rawUrl = stream?.url || '';
  const streamHeaders = stream?.headers || {};
  if (stream?.cookie) {
    streamHeaders['Cookie'] = stream.cookie;
  }
  const proxiedUrl = getProxiedStreamUrl(rawUrl, streamHeaders, proxyBase);

  // Determine media format
  const format = String(stream?.format || '').toUpperCase();
  const isDash = format === 'DASH' || rawUrl.includes('.mpd');
  const isHls = format === 'HLS' || rawUrl.includes('.m3u8');

  const shortStreamLabel = useMemo(() => {
    if (stream?.quality) {
      const q = stream.quality.trim().split(' ')[0];
      return q.length <= 6 ? q : q.substring(0, 5);
    }
    return format || '1080p';
  }, [stream, format]);

  // Teardown players helper
  const destroyEngines = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {}
      hlsRef.current = null;
    }
    if (dashRef.current) {
      try {
        dashRef.current.reset();
      } catch (e) {}
      dashRef.current = null;
    }
  }, []);

  // Initialize playback engine based on stream type
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !proxiedUrl) return;

    destroyEngines();
    setIsBuffering(true);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(proxiedUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setIsBuffering(false);
        }
      });
      hlsRef.current = hls;
    } else if (isDash) {
      const player = dashjs.MediaPlayer().create();
      player.initialize(video, proxiedUrl, true);
      player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
        setIsBuffering(false);
        video.play().catch(() => {});
      });
      player.on(dashjs.MediaPlayer.events.ERROR, () => {
        setIsBuffering(false);
      });
      dashRef.current = player;
    } else {
      // Direct MP4
      video.src = proxiedUrl;
      video.load();
      video.play().catch(() => {});
    }

    return () => {
      destroyEngines();
    };
  }, [proxiedUrl, isDash, isHls, destroyEngines]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration || 0);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('volumechange', onVolumeChange);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('volumechange', onVolumeChange);
    };
  }, []);

  // Auto-hide controls
  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !activeMenu) {
        setShowControls(false);
      }
    }, 3500);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const handleSeek = (e) => {
    const container = progressContainerRef.current;
    const video = videoRef.current;
    if (!container || !video || !duration) return;
    const rect = container.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pos * duration;
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handlePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (e) {
      toastWarning('Picture-in-Picture is not supported in this browser.');
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setActiveMenu(null);
  };

  // External player launcher handlers
  const handleOpenVlc = (isProxy = false) => {
    const target = isProxy ? proxiedUrl : rawUrl;
    if (!target) return;

    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isAndroid) {
      const referer = streamHeaders['Referer'] || 'https://sflix.film/';
      const ua = streamHeaders['User-Agent'] || 'Mozilla/5.0';
      const extraHeaders = `--http-referrer=${referer};--http-user-agent=${ua}`;
      const intentUri = `intent:${target}#Intent;package=org.videolan.vlc;type=video/*;S.extra_headers=${encodeURIComponent(extraHeaders)};end`;
      window.location.href = intentUri;
    } else if (isIOS) {
      window.location.href = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(target)}`;
    } else {
      // Desktop M3U File Download
      try {
        let m3u = `#EXTM3U\n#EXTINF:-1,${title}\n`;
        if (streamHeaders['User-Agent']) {
          m3u += `#EXTVLCOPT:http-user-agent=${streamHeaders['User-Agent']}\n`;
        }
        if (streamHeaders['Referer']) {
          m3u += `#EXTVLCOPT:http-referrer=${streamHeaders['Referer']}\n`;
        }
        m3u += `${target}\n`;
        const blob = new Blob([m3u], { type: 'audio/x-mpegurl;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_vlc.m3u`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toastSuccess('Downloaded VLC Playlist File (.m3u)!');
      } catch (e) {
        window.location.href = `vlc://${target}`;
      }
    }
  };

  const handleOpenMx = (isProxy = false) => {
    const target = isProxy ? proxiedUrl : rawUrl;
    if (!target) return;
    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    if (!isAndroid) {
      toastWarning('MX Player intents are only available on Android. Use VLC on Desktop.');
      return;
    }
    const referer = streamHeaders['Referer'] || 'https://sflix.film/';
    const ua = streamHeaders['User-Agent'] || 'Mozilla/5.0';
    const headers = `Referer:${encodeURIComponent(referer)}|User-Agent:${encodeURIComponent(ua)}`;
    window.location.href = `intent:${target}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;S.headers=${headers};end`;
  };

  const handleCopy = (type) => {
    const link = type === 'proxy' ? proxiedUrl : rawUrl;
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedType(type);
      toastSuccess(`Copied ${type === 'proxy' ? 'Proxied' : 'Direct'} Stream URL!`);
      setTimeout(() => setCopiedType(null), 3000);
    });
  };

  const handleDownload = () => {
    // Prefer MP4 stream for direct file downloading
    const mp4Stream =
      streams.find((s) => s.format === 'MP4' && s.quality_value === stream?.quality_value) ||
      streams.find((s) => s.format === 'MP4') ||
      stream;

    const targetUrl = mp4Stream?.url || rawUrl || proxiedUrl;
    if (!targetUrl) {
      toastWarning('No active stream URL available for download.');
      return;
    }

    const headers = mp4Stream
      ? { ...(mp4Stream.headers || {}), ...(mp4Stream.cookie ? { Cookie: mp4Stream.cookie } : {}) }
      : streamHeaders;

    const cleanTitle = (title || 'moviebox_video').replace(/[^\w\s.-]/gi, '').trim().replace(/\s+/g, '_');
    const filename = `${cleanTitle}.mp4`;
    const downloadUrl = getProxiedDownloadUrl(targetUrl, headers, filename, proxyBase);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.setAttribute('download', filename);
    a.setAttribute('target', '_blank');
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 100);
    toastSuccess(`Starting download: ${cleanTitle}.mp4`);
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || secs < 0) return '00:00';
    const totalSecs = Math.floor(secs);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 group select-none"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        onClick={togglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-14 h-14 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin shadow-lg" />
        </div>
      )}

      {/* Click-to-Play Center Overlay when paused */}
      {!isPlaying && !isBuffering && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer z-10"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-2xl shadow-amber-500/40 hover:scale-110 transition-transform">
            <Play size={32} className="fill-current ml-1" />
          </div>
        </div>
      )}

      {/* Top Bar (Title & Quick App Button) */}
      <div
        className={`absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between z-30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 max-w-[65%] sm:max-w-[70%]">
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {format || 'STREAM'}
          </span>
          <h4 className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-md">
            {title}
          </h4>
        </div>

        {/* Quick App Intent Trigger */}
        <div className="flex items-center gap-2">
          {format === 'MP4' && (
            <button
              onClick={handleDownload}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-400 text-xs font-semibold backdrop-blur-md border border-white/10 transition flex items-center gap-1"
              title="Download MP4"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}

          <button
            onClick={() => setActiveMenu(activeMenu === 'apps' ? null : 'apps')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition"
          >
            <ExternalLink size={13} className="text-amber-400" />
            <span className="hidden sm:inline">Open in App</span>
            <span className="sm:hidden">Apps</span>
          </button>
        </div>
      </div>

      {/* Modal / Sheet for External Players (Responsive: Bottom Sheet on Mobile, Popover on Desktop) */}
      {activeMenu === 'apps' && (
        <div
          className="fixed inset-0 sm:absolute sm:inset-auto sm:top-14 sm:right-4 z-[60] bg-black/75 sm:bg-transparent flex flex-col justify-end sm:block p-3 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none"
          onClick={() => setActiveMenu(null)}
        >
          <div
            className="w-full sm:w-72 max-h-[82vh] overflow-y-auto rounded-3xl sm:rounded-2xl shadow-2xl p-4 bg-darkbg border border-gray-700 animate-fade-in no-scrollbar space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tv size={14} className="text-amber-400" />
                <span>Open in App</span>
              </span>
              <button onClick={() => setActiveMenu(null)} className="p-1 rounded-lg text-gray-400 hover:text-white bg-white/5">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={() => { handleOpenVlc(false); setActiveMenu(null); }}
                className="w-full text-left px-3 py-2 rounded-xl bg-orange-600/20 text-orange-300 hover:bg-orange-600/30 flex items-center justify-between text-xs font-medium"
              >
                <span>VLC Player (Direct)</span>
                <ExternalLink size={12} />
              </button>
              <button
                onClick={() => { handleOpenMx(false); setActiveMenu(null); }}
                className="w-full text-left px-3 py-2 rounded-xl bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 flex items-center justify-between text-xs font-medium"
              >
                <span>MX Player (Direct)</span>
                <ExternalLink size={12} />
              </button>
              <button
                onClick={() => { handleOpenVlc(true); setActiveMenu(null); }}
                className="w-full text-left px-3 py-2 rounded-xl bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 flex items-center justify-between text-xs font-medium"
              >
                <span>VLC Player (Proxy)</span>
                <ExternalLink size={12} />
              </button>
              <button
                onClick={() => { handleOpenMx(true); setActiveMenu(null); }}
                className="w-full text-left px-3 py-2 rounded-xl bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 flex items-center justify-between text-xs font-medium"
              >
                <span>MX Player (Proxy)</span>
                <ExternalLink size={12} />
              </button>
            </div>

            <div className="pt-2 border-t border-white/10 space-y-1 text-xs">
              <button
                onClick={() => handleCopy('direct')}
                className="w-full text-left px-3 py-2 rounded-xl text-gray-300 hover:bg-white/10 flex items-center justify-between"
              >
                <span>Copy Direct URL</span>
                {copiedType === 'direct' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              </button>
              <button
                onClick={() => handleCopy('proxy')}
                className="w-full text-left px-3 py-2 rounded-xl text-gray-300 hover:bg-white/10 flex items-center justify-between"
              >
                <span>Copy Proxied URL</span>
                {copiedType === 'proxy' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stream Selector Modal / Sheet (Responsive) */}
      {activeMenu === 'streams' && (
        <div
          className="fixed inset-0 sm:absolute sm:inset-auto sm:bottom-16 sm:right-4 z-[60] bg-black/75 sm:bg-transparent flex flex-col justify-end sm:block p-3 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none"
          onClick={() => setActiveMenu(null)}
        >
          <div
            className="w-full sm:w-64 max-h-[82vh] overflow-y-auto rounded-3xl sm:rounded-2xl shadow-2xl p-4 bg-darkbg border border-gray-700 animate-fade-in no-scrollbar space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Select Stream Quality
              </span>
              <button onClick={() => setActiveMenu(null)} className="p-1 rounded-lg text-gray-400 hover:text-white bg-white/5">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {streams.map((st, i) => {
                const isSelected = st.url === stream?.url;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      onStreamChange?.(st);
                      setActiveMenu(null);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-amber-500 text-black font-bold'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{st.quality || st.resolution_tag || `Stream ${i + 1}`}</span>
                    <span className="text-[10px] opacity-80 uppercase">
                      {st.format} {st.size_mb ? `(${st.size_mb}MB)` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal / Sheet (Responsive) */}
      {activeMenu === 'settings' && (
        <div
          className="fixed inset-0 sm:absolute sm:inset-auto sm:bottom-16 sm:right-4 z-[60] bg-black/75 sm:bg-transparent flex flex-col justify-end sm:block p-3 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none"
          onClick={() => setActiveMenu(null)}
        >
          <div
            className="w-full sm:w-60 max-h-[82vh] overflow-y-auto rounded-3xl sm:rounded-2xl shadow-2xl p-4 bg-darkbg border border-gray-700 animate-fade-in no-scrollbar space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Playback Speed</span>
              <button onClick={() => setActiveMenu(null)} className="p-1 rounded-lg text-gray-400 hover:text-white bg-white/5">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                    playbackSpeed === s
                      ? 'bg-amber-500 text-black font-bold'
                      : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <span>{s === 1 ? '1.0x (Normal)' : `${s}x`}</span>
                  {playbackSpeed === s && <Check size={13} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar */}
        <div
          ref={progressContainerRef}
          onClick={handleSeek}
          className="relative w-full h-2 bg-white/20 hover:h-2.5 rounded-full cursor-pointer mb-2.5 transition-all overflow-hidden"
        >
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Clean Responsive Controls Row */}
        <div className="flex items-center justify-between text-white text-sm">
          {/* Left Controls: Play, Time, Volume */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={18} className="fill-current" /> : <Play size={18} className="fill-current" />}
            </button>

            {/* Seek -10 / +10 hidden on mobile, visible on desktop */}
            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime -= 10;
              }}
              className="p-1.5 rounded-xl hover:bg-white/20 text-gray-300 hover:text-white transition hidden sm:block"
              title="Rewind 10s"
            >
              <RotateCcw size={15} />
            </button>

            <button
              onClick={() => {
                if (videoRef.current) videoRef.current.currentTime += 10;
              }}
              className="p-1.5 rounded-xl hover:bg-white/20 text-gray-300 hover:text-white transition hidden sm:block"
              title="Forward 10s"
            >
              <RotateCw size={15} />
            </button>

            {/* Volume: Slider hidden on mobile */}
            <div className="hidden sm:flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-xl hover:bg-white/20 text-gray-300 hover:text-white transition"
              >
                {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    videoRef.current.muted = false;
                  }
                }}
                className="w-14 sm:w-16 h-1 bg-white/30 rounded-lg accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Time Stamp: Compact on mobile */}
            <span className="text-[11px] sm:text-xs text-gray-300 font-mono ml-1">
              <span className="sm:hidden">{formatTime(currentTime)}</span>
              <span className="hidden sm:inline">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </span>
          </div>

          {/* Right Controls: Quality/Stream, Speed/Settings, PiP, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Stream / Quality Button */}
            {streams.length > 0 && (
              <button
                onClick={() => setActiveMenu(activeMenu === 'streams' ? null : 'streams')}
                className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1 transition flex-shrink-0"
                title="Select Stream"
              >
                <Sliders size={12} className="text-amber-400" />
                <span className="sm:hidden text-[11px] font-mono">{shortStreamLabel}</span>
                <span className="hidden sm:inline text-xs">{stream?.quality || stream?.format || 'Quality'}</span>
              </button>
            )}

            {/* Settings (Speed) */}
            <button
              onClick={() => setActiveMenu(activeMenu === 'settings' ? null : 'settings')}
              className="p-1.5 rounded-xl hover:bg-white/20 text-gray-300 hover:text-white transition"
              title="Settings"
            >
              <Settings size={16} />
            </button>

            {/* PiP */}
            <button
              onClick={handlePiP}
              className="p-1.5 rounded-xl hover:bg-white/20 text-gray-300 hover:text-white transition hidden sm:block"
              title="Picture in Picture"
            >
              <PictureInPicture2 size={16} />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-xl hover:bg-white/20 text-gray-300 hover:text-white transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieboxPlayer;
