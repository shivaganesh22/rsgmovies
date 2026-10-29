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
  Cast,
  Gauge,
  Layers,
  FileDown,
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
  const clickTimerRef = useRef(null);
  const doubleClickCountRef = useRef(0);
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

  // Double-tap & Scrubbing state
  const [doubleTapFeedback, setDoubleTapFeedback] = useState(null);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragCurrentTime, setDragCurrentTime] = useState(0);

  // PiP state
  const [isPipActive, setIsPipActive] = useState(false);
  const isPipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;

  // Resolve headers and URLs
  const rawUrl = stream?.url || '';
  const streamHeaders = useMemo(() => {
    const h = { ...(stream?.headers || {}) };
    if (stream?.cookie) {
      h['Cookie'] = stream.cookie;
    }
    return h;
  }, [stream]);

  const proxiedUrl = useMemo(() => {
    if (!rawUrl) return '';
    return getProxiedStreamUrl(rawUrl, streamHeaders, proxyBase);
  }, [rawUrl, streamHeaders, proxyBase]);

  // Determine media format
  const format = String(stream?.format || '').toUpperCase();
  const isDash = format === 'DASH' || rawUrl.includes('.mpd');
  const isHls = format === 'HLS' || rawUrl.includes('.m3u8');

  // Stream badge / short label for mobile
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

  // Sync Fullscreen state across modern browsers, iOS Safari & Android
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isFs);
      if (!isFs && screen.orientation && typeof screen.orientation.unlock === 'function') {
        try {
          screen.orientation.unlock();
        } catch (e) {}
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    const video = videoRef.current;
    const onWebkitBegin = () => setIsFullscreen(true);
    const onWebkitEnd = () => setIsFullscreen(false);
    if (video) {
      video.addEventListener('webkitbeginfullscreen', onWebkitBegin);
      video.addEventListener('webkitendfullscreen', onWebkitEnd);
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      if (video) {
        video.removeEventListener('webkitbeginfullscreen', onWebkitBegin);
        video.removeEventListener('webkitendfullscreen', onWebkitEnd);
      }
    };
  }, []);

  // Auto-hide controls effect
  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }

    if (showControls && isPlaying && !activeMenu) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, isPlaying, activeMenu]);

  const handleUserActivity = () => {
    setShowControls(true);
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        setShowControls(true);
      }).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  }, []);

  const seek = useCallback((time) => {
    const video = videoRef.current;
    if (!video) return;
    const clampedTime = Math.max(0, Math.min(time, duration || 0));
    video.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    setShowControls(true);
  }, [duration]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const handleVolumeChange = useCallback((newVol) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVol;
    setVolume(newVol);
    video.muted = newVol === 0;
    setIsMuted(newVol === 0);
  }, []);

  // Fullscreen Landscape Toggle with iOS and Android screen orientation lock
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container) return;

    try {
      const isCurrentlyFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (!isCurrentlyFs) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
          await container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) {
          await container.msRequestFullscreen();
        } else if (video && video.webkitEnterFullscreen) {
          // iOS Safari iPhone fallback
          video.webkitEnterFullscreen();
          setIsFullscreen(true);
          return;
        }
        setIsFullscreen(true);

        // Lock to landscape mode on mobile devices (Android / PWA)
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          try {
            await screen.orientation.lock('landscape');
          } catch (e) {
            try {
              await screen.orientation.lock('landscape-primary');
            } catch (err) {}
          }
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
          await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
        setIsFullscreen(false);
        if (screen.orientation && typeof screen.orientation.unlock === 'function') {
          try {
            screen.orientation.unlock();
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  }, []);

  // Picture-in-Picture (PiP)
  const handlePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (e) {
      toastWarning('Picture-in-Picture is not supported in this browser.');
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnterPip = () => setIsPipActive(true);
    const onLeavePip = () => setIsPipActive(false);
    video.addEventListener('enterpictureinpicture', onEnterPip);
    video.addEventListener('leavepictureinpicture', onLeavePip);
    return () => {
      video.removeEventListener('enterpictureinpicture', onEnterPip);
      video.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, []);

  // Drag Seek Scrubbing (Touch + Mouse)
  const getSeekTimeFromEvent = useCallback((clientX) => {
    if (!progressContainerRef.current || !duration) return 0;
    const rect = progressContainerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  }, [duration]);

  const handleSeekPointerDown = (e) => {
    e.stopPropagation();
    setIsDraggingSeek(true);
    setShowControls(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const newTime = getSeekTimeFromEvent(clientX);
    setDragCurrentTime(newTime);
  };

  useEffect(() => {
    if (!isDraggingSeek) return;

    const handlePointerMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const newTime = getSeekTimeFromEvent(clientX);
      setDragCurrentTime(newTime);
    };

    const handlePointerUp = (e) => {
      const clientX = e.changedTouches ? e.changedTouches[0].clientX : (e.clientX || 0);
      const finalTime = getSeekTimeFromEvent(clientX);
      seek(finalTime);
      setIsDraggingSeek(false);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDraggingSeek, getSeekTimeFromEvent, seek]);

  // Screen Click & Gesture Handling (Movieblast feature clone):
  // 1. Single tap center (30% - 70%) -> Play / Pause
  // 2. Single tap edges (< 30% or > 70%) -> Toggle controls visibility
  // 3. Double tap left (< 30%) -> Seek backward 10s with ripple
  // 4. Double tap right (> 70%) -> Seek forward 10s with ripple
  // 5. Double tap center (30% - 70%) -> Fullscreen landscape toggle
  const handleScreenClick = (e) => {
    if (activeMenu) {
      setActiveMenu(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickRatio = width > 0 ? clickX / width : 0.5;

    doubleClickCountRef.current += 1;

    if (doubleClickCountRef.current === 1) {
      clickTimerRef.current = setTimeout(() => {
        if (clickRatio >= 0.30 && clickRatio <= 0.70) {
          togglePlay();
        } else {
          setShowControls((prev) => !prev);
        }
        doubleClickCountRef.current = 0;
      }, 250);
    } else if (doubleClickCountRef.current === 2) {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      doubleClickCountRef.current = 0;

      if (clickRatio < 0.30) {
        seek((videoRef.current?.currentTime || 0) - 10);
        setDoubleTapFeedback({ side: 'left', text: '-10s' });
        setTimeout(() => setDoubleTapFeedback(null), 750);
      } else if (clickRatio > 0.70) {
        seek((videoRef.current?.currentTime || 0) + 10);
        setDoubleTapFeedback({ side: 'right', text: '+10s' });
        setTimeout(() => setDoubleTapFeedback(null), 750);
      } else {
        toggleFullscreen();
      }
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
          e.preventDefault();
          seek((videoRef.current?.currentTime || 0) - 10);
          setDoubleTapFeedback({ side: 'left', text: '-10s' });
          setTimeout(() => setDoubleTapFeedback(null), 750);
          break;
        case 'arrowright':
          e.preventDefault();
          seek((videoRef.current?.currentTime || 0) + 10);
          setDoubleTapFeedback({ side: 'right', text: '+10s' });
          setTimeout(() => setDoubleTapFeedback(null), 750);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'p':
          e.preventDefault();
          handlePiP();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleFullscreen, toggleMute, seek, volume, handleVolumeChange, handlePiP]);

  // AirPlay / Cast Handler
  const handleCast = () => {
    const video = videoRef.current;
    setActiveMenu(null);
    if (video && video.remote && typeof video.remote.prompt === 'function') {
      video.remote.prompt().catch(() => {});
    } else if (video && video.webkitShowPlaybackTargetPicker) {
      try {
        video.webkitShowPlaybackTargetPicker();
      } catch (e) {}
    } else {
      toastSuccess('Cast: Ensure your Chromecast or Smart TV is on the same Wi-Fi.');
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setActiveMenu(null);
  };

  // External player launcher handlers with complete header support
  const handleOpenVlc = (isProxy = false) => {
    const target = isProxy ? proxiedUrl : rawUrl;
    if (!target) return;

    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    const referer = streamHeaders['Referer'] || '';
    const ua = streamHeaders['User-Agent'] || 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36';
    const cookie = streamHeaders['Cookie'] || stream?.cookie || '';

    if (isAndroid) {
      // For VLC Android, official builds do not parse intent headers.
      // Proxied streams play reliably without 403 errors.
      // For direct streams, we also supply intent extras for custom/patched VLC builds.
      const extraHeaders = [
        referer ? `--http-referrer=${referer}` : null,
        ua ? `--http-user-agent=${ua}` : null,
        cookie ? `--http-cookie=${cookie}` : null,
      ].filter(Boolean).join(';');

      const intentUri = `intent:${target}#Intent;package=org.videolan.vlc;type=video/*;${extraHeaders ? `S.extra_headers=${encodeURIComponent(extraHeaders)};` : ''}end`;
      window.location.href = intentUri;
    } else if (isIOS) {
      window.location.href = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(target)}`;
    } else {
      // Desktop: Download .m3u playlist with full #EXTVLCOPT
      handleDownloadM3u(isProxy);
    }
  };

  const handleDownloadM3u = (isProxy = false) => {
    const target = isProxy ? proxiedUrl : rawUrl;
    if (!target) return;

    const referer = streamHeaders['Referer'] || '';
    const ua = streamHeaders['User-Agent'] || 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36';
    const cookie = streamHeaders['Cookie'] || stream?.cookie || '';

    try {
      let m3u = `#EXTM3U\n#EXTINF:-1,${title || 'Moviebox Stream'}\n`;
      if (!isProxy) {
        if (ua) m3u += `#EXTVLCOPT:http-user-agent=${ua}\n`;
        if (referer) m3u += `#EXTVLCOPT:http-referrer=${referer}\n`;
        if (cookie) m3u += `#EXTVLCOPT:http-cookie=${cookie}\n`;
      }
      m3u += `${target}\n`;

      const blob = new Blob([m3u], { type: 'audio/x-mpegurl;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(title || 'stream').replace(/[^a-zA-Z0-9_-]/g, '_')}_vlc.m3u`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toastSuccess('Downloaded VLC Playlist (.m3u) with full stream headers!');
    } catch (e) {
      window.location.href = `vlc://${target}`;
    }
  };

  const handleOpenMx = (isProxy = false) => {
    const target = isProxy ? proxiedUrl : rawUrl;
    if (!target) return;
    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    if (!isAndroid) {
      toastWarning('MX Player intents are only supported on Android. For desktop, use VLC or PotPlayer.');
      return;
    }

    const referer = streamHeaders['Referer'] || '';
    const ua = streamHeaders['User-Agent'] || 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36';
    const cookie = streamHeaders['Cookie'] || stream?.cookie || '';

    // MX Player syntax: URL pipe syntax <url>|Referer=...&User-Agent=...&Cookie=...
    let targetWithHeaders = target;
    if (!isProxy) {
      const parts = [];
      if (referer) parts.push(`Referer=${encodeURIComponent(referer)}`);
      if (ua) parts.push(`User-Agent=${encodeURIComponent(ua)}`);
      if (cookie) parts.push(`Cookie=${encodeURIComponent(cookie)}`);
      if (parts.length > 0) {
        targetWithHeaders = `${target}|${parts.join('&')}`;
      }
    }

    const extraHeadersLines = [
      referer ? `Referer: ${referer}` : null,
      ua ? `User-Agent: ${ua}` : null,
      cookie ? `Cookie: ${cookie}` : null,
    ].filter(Boolean).join('\n');

    const cleanTitle = (title || 'Moviebox Stream').replace(/[^\w\s.-]/gi, '').trim();
    const intentUri = `intent:${targetWithHeaders}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;S.title=${encodeURIComponent(cleanTitle)};${extraHeadersLines ? `S.headers=${encodeURIComponent(extraHeadersLines)};` : ''}end`;
    window.location.href = intentUri;
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

  const progressPercent = duration > 0
    ? ((isDraggingSeek ? dragCurrentTime : currentTime) / duration) * 100
    : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onTouchMove={handleUserActivity}
      onMouseLeave={() => isPlaying && !activeMenu && setShowControls(false)}
      className={`relative w-full ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] rounded-none aspect-auto w-screen h-screen'
          : 'aspect-video rounded-2xl sm:rounded-3xl'
      } bg-black ${activeMenu ? 'overflow-visible' : 'overflow-hidden'} shadow-2xl border border-white/10 group select-none transition-all duration-200`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Screen Click & Double-Tap Area */}
      <div
        onClick={handleScreenClick}
        className="absolute inset-0 z-0 cursor-pointer"
      />

      {/* Animated Double-Tap Seek Feedback Ripples */}
      {doubleTapFeedback && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none z-30 flex flex-col items-center justify-center w-24 h-24 rounded-full bg-amber-500/40 text-white backdrop-blur-md animate-ping ${
            doubleTapFeedback.side === 'left' ? 'left-8 sm:left-14' : 'right-8 sm:right-14'
          }`}
        >
          {doubleTapFeedback.side === 'left' ? <RotateCcw size={28} /> : <RotateCw size={28} />}
          <span className="text-xs font-bold mt-1">{doubleTapFeedback.text}</span>
        </div>
      )}

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-14 h-14 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin shadow-lg" />
        </div>
      )}

      {/* Center Big Play Button when paused */}
      {!isPlaying && !isBuffering && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer z-10 pointer-events-none"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-2xl shadow-amber-500/40 hover:scale-110 transition-transform pointer-events-auto">
            <Play size={32} className="fill-current ml-1" />
          </div>
        </div>
      )}

      {/* Top Bar (Title & Quick Actions) */}
      <div
        className={`absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between z-30 transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 max-w-[60%] sm:max-w-[70%]">
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {format || 'STREAM'}
          </span>
          <h4 className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-md">
            {title}
          </h4>
        </div>

        {/* Top-Right Quick Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
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
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold backdrop-blur-md border transition shadow-md ${
              activeMenu === 'apps'
                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                : 'bg-black/60 hover:bg-black/90 text-white border-white/15'
            }`}
          >
            <Tv size={13} className={activeMenu === 'apps' ? 'text-black' : 'text-amber-400'} />
            <span className="hidden sm:inline">Open in App</span>
            <span className="sm:hidden">Apps</span>
          </button>
        </div>
      </div>

      {/* External 3rd Party Players Menu (Mobile Fullscreen Sheet / Desktop Glass Dropdown) */}
      {activeMenu === 'apps' && (
        <div
          className="fixed inset-0 sm:absolute sm:inset-auto sm:top-14 sm:right-4 z-[60] bg-black/75 sm:bg-transparent flex flex-col justify-end sm:block p-3 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none"
          onClick={() => setActiveMenu(null)}
        >
          <div
            className="w-full sm:w-80 max-h-[85vh] overflow-y-auto rounded-3xl sm:rounded-2xl shadow-2xl p-4 bg-darkbg border border-gray-700 animate-fade-in no-scrollbar space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Tv size={14} className="text-amber-400" />
                <span>External Video Players</span>
              </span>
              <button
                onClick={() => setActiveMenu(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white bg-white/5"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1.5">
              {/* 1. VLC Player Direct */}
              <button
                onClick={() => {
                  handleOpenVlc(false);
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-2 sm:py-2.5 rounded-xl bg-orange-600/20 text-orange-200 hover:bg-orange-600/30 flex items-center justify-between text-xs font-medium border border-orange-500/20 transition"
              >
                <div>
                  <span className="block font-semibold text-white text-xs">VLC Player (Direct)</span>
                  <span className="text-[10px] text-orange-300/70 hidden sm:block">Direct intent (Mobile) / M3U (Desktop)</span>
                </div>
                <ExternalLink size={13} className="text-orange-400 flex-shrink-0" />
              </button>

              {/* 2. MX Player Direct */}
              <button
                onClick={() => {
                  handleOpenMx(false);
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-2 sm:py-2.5 rounded-xl bg-sky-600/20 text-sky-200 hover:bg-sky-600/30 flex items-center justify-between text-xs font-medium border border-sky-500/20 transition"
              >
                <div>
                  <span className="block font-semibold text-white text-xs">MX Player (Direct)</span>
                  <span className="text-[10px] text-sky-300/80 hidden sm:block">Direct stream with injected headers</span>
                </div>
                <ExternalLink size={13} className="text-sky-400 flex-shrink-0" />
              </button>

              {/* 3. VLC Player Proxied */}
              <button
                onClick={() => {
                  handleOpenVlc(true);
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-2 sm:py-2.5 rounded-xl bg-amber-600/20 text-amber-200 hover:bg-amber-600/30 flex items-center justify-between text-xs font-medium border border-amber-500/30 transition"
              >
                <div>
                  <span className="block font-semibold text-white text-xs">VLC Player (Proxy)</span>
                  <span className="text-[10px] text-amber-300/80 hidden sm:block">Server-injected proxy stream</span>
                </div>
                <ExternalLink size={13} className="text-amber-400 flex-shrink-0" />
              </button>

              {/* 4. MX Player Proxied */}
              <button
                onClick={() => {
                  handleOpenMx(true);
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-2 sm:py-2.5 rounded-xl bg-blue-600/20 text-blue-200 hover:bg-blue-600/30 flex items-center justify-between text-xs font-medium border border-blue-500/20 transition"
              >
                <div>
                  <span className="block font-semibold text-white text-xs">MX Player (Proxy)</span>
                  <span className="text-[10px] text-blue-300/70 hidden sm:block">Proxied stream playback</span>
                </div>
                <ExternalLink size={13} className="text-blue-400 flex-shrink-0" />
              </button>

              {/* 5. Download VLC M3U Playlist */}
              <button
                onClick={() => {
                  handleDownloadM3u(false);
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-2 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 flex items-center justify-between text-xs font-medium border border-white/5 transition"
              >
                <div className="flex items-center gap-2">
                  <FileDown size={14} className="text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="block text-white text-xs">Download VLC Playlist (.m3u)</span>
                    <span className="text-[10px] text-gray-400 hidden sm:block">Includes Cookie, Referer & User-Agent</span>
                  </div>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-white/10 space-y-1 text-xs">
              <button
                onClick={() => handleCopy('direct')}
                className="w-full text-left px-3 py-2 rounded-xl text-gray-300 hover:bg-white/10 flex items-center justify-between transition"
              >
                <span>Copy Direct Stream URL</span>
                {copiedType === 'direct' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-gray-400" />}
              </button>
              <button
                onClick={() => handleCopy('proxy')}
                className="w-full text-left px-3 py-2 rounded-xl text-gray-300 hover:bg-white/10 flex items-center justify-between transition"
              >
                <span>Copy Proxied Stream URL</span>
                {copiedType === 'proxy' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-gray-400" />}
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
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-amber-400" />
                <span>Stream Quality</span>
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
                    className={`w-full text-left px-3 py-2 sm:py-2.5 rounded-xl text-xs flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-amber-500 text-black font-bold'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <span className="block font-semibold">{st.quality || st.resolution_tag || `Stream ${i + 1}`}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-black/80' : 'text-gray-400'} hidden sm:block`}>
                        {st.source || st.codec || st.format || 'Standard CDN'}
                      </span>
                    </div>
                    <span className="text-[10px] opacity-80 uppercase font-mono">
                      {st.format} {st.size_mb ? `(${st.size_mb}MB)` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (Speed, Cast) */}
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
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Playback Settings</span>
              <button onClick={() => setActiveMenu(null)} className="p-1 rounded-lg text-gray-400 hover:text-white bg-white/5">
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1">
              {/* Cast Option */}
              <button
                onClick={handleCast}
                className="w-full text-left px-3 py-2.5 rounded-xl text-xs text-gray-200 hover:text-white hover:bg-white/10 transition flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Cast size={14} className="text-amber-400" />
                  <span>Cast to TV</span>
                </span>
                <span className="text-amber-400 text-[10px] font-semibold">AirPlay / Cast</span>
              </button>

              {/* Playback Speed Submenu trigger */}
              <div className="pt-2 border-t border-white/10">
                <span className="text-[10px] text-gray-400 uppercase font-bold px-1 mb-1 block">Speed</span>
                <div className="grid grid-cols-3 gap-1">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`px-2 py-1.5 rounded-lg text-xs font-medium transition text-center ${
                        playbackSpeed === s
                          ? 'bg-amber-500 text-black font-bold'
                          : 'text-gray-300 hover:bg-white/10 bg-white/5'
                      }`}
                    >
                      {s === 1 ? '1.0x' : `${s}x`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-30 transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar (Click & Drag Scrubbing for Mouse & Touch) */}
        <div
          ref={progressContainerRef}
          onMouseDown={handleSeekPointerDown}
          onTouchStart={handleSeekPointerDown}
          className="relative w-full h-3 sm:h-2 py-1 flex items-center cursor-pointer mb-2 group/progress touch-none select-none pointer-events-auto"
        >
          {/* Background Track */}
          <div className="w-full h-1 sm:h-1.5 group-hover/progress:h-2 bg-gray-600/60 rounded-full transition-all relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Scrub Thumb Handle */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-3 sm:h-3 bg-amber-400 rounded-full shadow-lg transform -translate-x-1/2 transition-all ${
              isDraggingSeek ? 'opacity-100 scale-125' : 'opacity-0 group-hover/progress:opacity-100'
            }`}
            style={{ width: '12px', height: '12px', left: `${progressPercent}%` }}
          />

          {/* Drag Time Scrub Tooltip */}
          {isDraggingSeek && (
            <div
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-black/90 text-amber-300 text-[10px] font-mono font-bold shadow pointer-events-none border border-amber-500/30"
              style={{
                left: `${
                  duration > 0
                    ? Math.max(5, Math.min(95, (dragCurrentTime / duration) * 100))
                    : 0
                }%`,
              }}
            >
              {formatTime(dragCurrentTime)}
            </div>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center justify-between text-white text-sm pointer-events-auto">
          {/* Left Controls: Play/Pause, Rewind/Forward, Volume, Timestamp */}
          <div className="flex items-center gap-2 sm:gap-3.5">
            <button
              onClick={togglePlay}
              className="p-1 rounded-xl hover:text-amber-400 transition"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current" />}
            </button>

            <button
              onClick={() => seek(currentTime - 10)}
              className="p-1 rounded-xl hover:text-amber-400 transition text-gray-300 hidden sm:block"
              title="Seek -10s (Left Arrow)"
            >
              <RotateCcw size={16} />
            </button>

            <button
              onClick={() => seek(currentTime + 10)}
              className="p-1 rounded-xl hover:text-amber-400 transition text-gray-300 hidden sm:block"
              title="Seek +10s (Right Arrow)"
            >
              <RotateCw size={16} />
            </button>

            {/* Volume: Hidden on small mobile */}
            <div className="hidden sm:flex items-center gap-1.5 group/vol">
              <button
                onClick={toggleMute}
                className="hover:text-amber-400 transition text-gray-300"
                title="Mute (M)"
              >
                {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-14 sm:w-16 h-1 bg-white/30 rounded-lg accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Time Stamp */}
            <span className="text-[11px] sm:text-xs text-gray-300 font-mono ml-0.5 sm:ml-1">
              <span className="sm:hidden">{formatTime(currentTime)}</span>
              <span className="hidden sm:inline">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </span>
          </div>

          {/* Right Controls: Streams, Settings, PiP, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Stream / Quality Button */}
            {streams.length > 0 && (
              <button
                onClick={() => setActiveMenu(activeMenu === 'streams' ? null : 'streams')}
                className={`px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition flex-shrink-0 ${
                  activeMenu === 'streams'
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title="Select Stream"
              >
                <Sliders size={12} className={activeMenu === 'streams' ? 'text-black' : 'text-amber-400'} />
                <span className="sm:hidden text-[11px] font-mono">{shortStreamLabel}</span>
                <span className="hidden sm:inline text-xs">{stream?.quality || stream?.format || 'Quality'}</span>
              </button>
            )}

            {/* Settings (Speed & Cast) */}
            <button
              onClick={() => setActiveMenu(activeMenu === 'settings' ? null : 'settings')}
              className={`p-1.5 rounded-xl transition ${
                activeMenu === 'settings' ? 'text-amber-400 bg-white/15' : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Settings"
            >
              <Settings size={17} />
            </button>

            {/* PiP */}
            {isPipSupported && (
              <button
                onClick={handlePiP}
                className={`p-1.5 rounded-xl transition hidden sm:block ${
                  isPipActive ? 'text-amber-400 bg-white/15' : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
                title="Picture-in-Picture (P)"
              >
                <PictureInPicture2 size={17} />
              </button>
            )}

            {/* Fullscreen (Landscape mode on mobile) */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-xl hover:text-amber-400 transition hover:bg-white/10 ml-0.5"
              title="Fullscreen Landscape (F)"
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieboxPlayer;
