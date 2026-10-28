import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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
  ExternalLink,
  Cast,
  Subtitles,
  Sliders,
  Copy,
  Check,
  Radio,
  Tv,
  Layers,
  PictureInPicture2,
} from 'lucide-react';
import { toastSuccess } from '../ui/Notifications';
import { getIStreamVpsProxyUrl } from '../../api/istream';

export const IStreamPlayer = ({
  src,
  poster,
  title,
  qualities = [],
  onQualityChange,
  currentQuality,
  mediaId,
  mediaType = 'movie',
  seasonNumber,
  episodeNumber,
  episodeName,
  genre,
  genresname,
  rating,
  year,
  initialTime = 0,
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressContainerRef = useRef(null);
  const hlsRef = useRef(null);
  const dashRef = useRef(null);
  const clickTimerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const doubleClickCountRef = useRef(0);
  const initialSeekDoneRef = useRef(false);
  const hasLoggedPlayRef = useRef(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [hasError, setHasError] = useState(false);

  // PiP & Drag Scrubbing state
  const [isPipActive, setIsPipActive] = useState(false);
  const isPipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document;
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragCurrentTime, setDragCurrentTime] = useState(0);

  // Menus: 'settings', 'players', 'subtitles', 'speed', 'streams', 'quality'
  const [activeMenu, setActiveMenu] = useState(null);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState(null);

  // Dynamic Tracks
  const [hlsQualities, setHlsQualities] = useState([]);
  const [currentHlsQuality, setCurrentHlsQuality] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const isLiveTv = mediaType === 'livetv' || String(genre || '').toLowerCase().includes('live tv');

  // Compute safe stream URL (Direct for Live TV, Proxied directly via VPS for iStream Movies & Web Series)
  const safeSrc = useMemo(() => {
    const rawUrl = src || mediaId || '';
    if (!rawUrl) return '';

    if (isLiveTv) {
      if (rawUrl.startsWith('http://') && window.location.protocol === 'https:') {
        return rawUrl.replace('http://', 'https://');
      }
      return rawUrl;
    }

    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && rawUrl.startsWith('http://129.225.111.76:5000')) {
      return rawUrl.replace('http://129.225.111.76:5000', `${window.location.origin}/stream-proxy`);
    }

    if (rawUrl.includes(':5000/stream') || rawUrl.includes(':5000/proxy') || rawUrl.includes('/stream-proxy/')) {
      return rawUrl;
    }

    // Directly proxy through VPS server, completely bypassing Django backend
    return getIStreamVpsProxyUrl(rawUrl);
  }, [src, mediaId, isLiveTv]);

  // Selected stream label for bottom bar
  const selectedStreamLabel = useMemo(() => {
    if (currentQuality) {
      return `${currentQuality.server || currentQuality.video_name || 'Server 1'}${currentQuality.lang ? ` (${currentQuality.lang})` : ''}`;
    }
    return '1080p Stream';
  }, [currentQuality]);

  const shortStreamLabel = useMemo(() => {
    if (currentQuality) {
      const q = currentQuality.video_name || currentQuality.quality || '';
      const s = currentQuality.server || '';
      const l = currentQuality.lang || '';
      if (q) return q.substring(0, 5);
      if (s) return s.replace(/Server\s*/i, 'S').substring(0, 5);
      if (l) return l.substring(0, 5);
    }
    return '1080p';
  }, [currentQuality]);

  const updateDetectedTracks = useCallback(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    const dash = dashRef.current;

    // Subtitle / Caption Tracks Detection
    if (dash && dash.getTracksFor) {
      const dashSubs = dash.getTracksFor('text');
      if (dashSubs && dashSubs.length > 0) {
        setSubtitleTracks(
          dashSubs.map((t, idx) => ({
            id: idx,
            name: (t.label || t.lang || `Subtitle ${idx + 1}`).toUpperCase(),
            lang: t.lang || '',
            type: 'dash',
          }))
        );
      }
    } else if (hls && hls.subtitleTracks && hls.subtitleTracks.length > 0) {
      setSubtitleTracks(
        hls.subtitleTracks.map((t, idx) => ({
          id: idx,
          name: t.name || t.lang || `Subtitle ${idx + 1}`,
          lang: t.lang || '',
          type: 'hls',
        }))
      );
      setCurrentSubtitleTrack(hls.subtitleTrack);
    } else if (video && video.textTracks && video.textTracks.length > 0) {
      const natSubs = Array.from(video.textTracks)
        .filter((t) => t.kind === 'subtitles' || t.kind === 'captions')
        .map((t, idx) => ({
          id: idx,
          name: (t.label || t.language || `Subtitle ${idx + 1}`).toUpperCase(),
          lang: t.language || '',
          type: 'native',
        }));
      if (natSubs.length > 0) {
        setSubtitleTracks(natSubs);
      }
    }
  }, []);

  // Initialize Video Player (DASH for Movies/Series, HLS/Native for Live TV)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !safeSrc) return;

    setHasError(false);
    hasLoggedPlayRef.current = false;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (dashRef.current) {
      try {
        dashRef.current.reset();
      } catch (e) {}
      dashRef.current = null;
    }

    const isHls = !isLiveTv ? (safeSrc.includes('.m3u8') || safeSrc.includes('/hls/')) : true;
    const isDash = !isLiveTv && !isHls;

    const initDashPlayer = () => {
      try {
        const dashPlayer = dashjs.MediaPlayer().create();
        dashPlayer.updateSettings({
          streaming: {
            buffer: {
              fastSwitchEnabled: true,
              bufferTimeDefault: 8,
              bufferTimeAtTopQuality: 8,
              bufferTimeAtTopQualityLongForm: 8,
              bufferToKeep: 20,
            },
            abr: {
              autoSwitchBitrate: { video: true },
            },
          },
        });
        const autoPlay = Boolean(isLiveTv);
        dashPlayer.initialize(video, safeSrc, autoPlay);
        dashRef.current = dashPlayer;

        const populateDashBitrates = () => {
          const bitrates = dashPlayer.getBitrateInfoListFor('video');
          if (bitrates && bitrates.length > 0) {
            const sorted = [...bitrates].sort((a, b) => (b.height || 0) - (a.height || 0));
            setHlsQualities(
              sorted.map((b) => {
                let badge = '';
                if (b.height >= 2160) badge = '4K';
                else if (b.height >= 1440) badge = '2K';
                else if (b.height >= 1080) badge = 'FHD';
                else if (b.height >= 720) badge = 'HD';
                return {
                  index: b.qualityIndex,
                  height: b.height || 0,
                  bitrate: b.bitrate || 0,
                  label: `${b.height || 'SD'}p ${badge}`.trim(),
                };
              })
            );
          }
          updateDetectedTracks();
        };

        dashPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
          setHasError(false);
          populateDashBitrates();
        });
        dashPlayer.on(dashjs.MediaPlayer.events.CAN_PLAY, populateDashBitrates);
        dashPlayer.on(dashjs.MediaPlayer.events.TEXT_TRACKS_ADDED, updateDetectedTracks);
        dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (err) => {
          console.warn('DASH stream error:', err);
          if (err && (err.error === 'capability' || err.error === 'mediasource')) {
            setHasError(true);
          }
        });
      } catch (err) {
        console.warn('DASH player initialization error:', err);
        setHasError(true);
      }
    };

    if (isDash) {
      initDashPlayer();
    } else if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        renderTextTracksNatively: true,
        startPosition: initialTime && Number(initialTime) > 0 ? Number(initialTime) : -1,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });

      hls.loadSource(safeSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (hls.levels && hls.levels.length > 0) {
          const levels = hls.levels.map((lvl, index) => ({
            index,
            height: lvl.height || 0,
            bitrate: lvl.bitrate || 0,
            label: lvl.height ? `${lvl.height}p` : `Stream ${index + 1}`,
          }));
          setHlsQualities(levels);
        }
        updateDetectedTracks();
        if (isLiveTv) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.warn('HLS Error:', data);
          setHasError(true);
        }
      });

      hlsRef.current = hls;
    } else {
      video.src = safeSrc;
      video.load();
      if (isLiveTv) {
        video.play().catch(() => {});
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (dashRef.current) {
        try {
          dashRef.current.reset();
        } catch (e) {}
        dashRef.current = null;
      }
    };
  }, [safeSrc, isLiveTv, initialTime, updateDetectedTracks]);

  // Auto-hide controls effect
  useEffect(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }

    if (showControls && isPlaying && !activeMenu) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
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

  // Picture-in-Picture (PiP)
  const togglePip = async () => {
    try {
      const video = videoRef.current;
      if (!video) return;
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  };

  // Drag Seek Scrubbing
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

  const handleSpeedChange = (speed) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackRate(speed);
      setActiveMenu(null);
    }
  };

  const handleHlsQualitySelect = (qualityIndex) => {
    if (dashRef.current) {
      if (qualityIndex === -1) {
        dashRef.current.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: true } } } });
      } else {
        dashRef.current.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
        dashRef.current.setQualityFor('video', qualityIndex, true);
      }
      setCurrentHlsQuality(qualityIndex);
      setActiveMenu(null);
    } else if (hlsRef.current) {
      hlsRef.current.currentLevel = qualityIndex;
      setCurrentHlsQuality(qualityIndex);
      setActiveMenu(null);
    }
  };

  const handleSubtitleTrackSelect = (track) => {
    const hls = hlsRef.current;
    const dash = dashRef.current;
    const video = videoRef.current;
    if (!track || track === -1) {
      if (dash) {
        try {
          dash.enableText(false);
          dash.setTextTrack(-1);
        } catch (e) {}
      }
      if (hls) {
        hls.subtitleTrack = -1;
        hls.subtitleDisplay = false;
      }
      if (video && video.textTracks) {
        Array.from(video.textTracks).forEach((t) => {
          t.mode = 'disabled';
        });
      }
      setCurrentSubtitleTrack(-1);
    } else {
      const trackId = typeof track === 'object' ? track.id : track;
      if (dash) {
        try {
          dash.enableText(true);
          dash.setTextTrack(trackId);
        } catch (e) {}
      }
      if (track?.type === 'hls' && hls) {
        hls.subtitleTrack = trackId;
        hls.subtitleDisplay = true;
      }
      if (video && video.textTracks) {
        Array.from(video.textTracks).forEach((t, i) => {
          t.mode = i === trackId ? 'showing' : 'disabled';
        });
      }
      setCurrentSubtitleTrack(trackId);
    }
    setActiveMenu(null);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVol) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
          screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        if (screen.orientation && typeof screen.orientation.unlock === 'function') {
          screen.orientation.unlock();
        }
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  };

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
      toastSuccess('Cast: Ensure Smart TV or Chromecast is connected on the same Wi-Fi.');
    }
  };

  const fetchStreamUrl = async () => {
    let targetUrl = src || mediaId || '';

    // Extract inner target URL if nested in query params or proxy path
    if (targetUrl.includes('id=')) {
      const parts = targetUrl.split('id=');
      const candidate = decodeURIComponent(parts[parts.length - 1].split('&')[0]);
      if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
        targetUrl = candidate;
      }
    } else if (targetUrl.includes('url=')) {
      const parts = targetUrl.split('url=');
      const candidate = decodeURIComponent(parts[parts.length - 1].split('&')[0]);
      if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
        targetUrl = candidate;
      }
    }

    let directUrl = '';
    let proxyUrl = '';
    try {
      const res = await fetch(`/react/istream/vlc-info/?url=${encodeURIComponent(targetUrl)}`);
      if (res.ok) {
        const data = await res.json();
        directUrl = data.direct_url;
        proxyUrl = data.proxy_url || data.vps_proxy_url;
      }
    } catch (e) {
      console.warn('Failed to fetch vlc-info:', e);
    }

    if (!directUrl) {
      directUrl = targetUrl;
    }
    if (directUrl && directUrl.startsWith('/')) {
      directUrl = window.location.origin + directUrl;
    }
    if (!proxyUrl) {
      proxyUrl = getIStreamVpsProxyUrl(directUrl || targetUrl);
    }
    return { directUrl, proxyUrl };
  };

  const pauseVideo = () => {
    const video = videoRef.current;
    if (video && !video.paused) {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleOpenVlc = async (useProxy = false) => {
    pauseVideo();
    const { directUrl, proxyUrl } = await fetchStreamUrls();
    const streamUrl = useProxy ? proxyUrl : directUrl;
    if (!streamUrl) return;

    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isAndroid) {
      if (useProxy) {
        // Proxied stream through VPS proxy does not need complex cookies in VLC
        const intentUri =
          `intent:${streamUrl}#Intent;` +
          `package=org.videolan.vlc;` +
          `type=video/*;` +
          `S.title=${encodeURIComponent((title || 'iStream') + ' (Proxy)')};` +
          `end`;
        window.location.href = intentUri;
      } else {
        const chromeUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        const cookie = 'tstc=p';
        const intentUri =
          `intent:${streamUrl}#Intent;` +
          `package=org.videolan.vlc;` +
          `type=video/*;` +
          `S.title=${encodeURIComponent((title || 'iStream') + ' (Direct)')};` +
          `S.http-user-agent=${encodeURIComponent(chromeUa)};` +
          `S.http-cookie=${encodeURIComponent(cookie)};` +
          `S.headers=${encodeURIComponent("User-Agent: " + chromeUa + "\\r\\nCookie: " + cookie)};` +
          `S.extra_headers=${encodeURIComponent("User-Agent: " + chromeUa + "\\r\\nCookie: " + cookie)};` +
          `end`;
        window.location.href = intentUri;
      }
    } else if (isIOS) {
      window.location.href = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(streamUrl)}`;
    } else {
      // Desktop M3U File Download
      try {
        let m3uContent = `#EXTM3U\n#EXTINF:-1,${title || 'iStream'} (${useProxy ? 'VPS Proxy' : 'Direct'})\n`;
        if (!useProxy) {
          m3uContent += `#EXTVLCOPT:http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\n`;
          m3uContent += `#EXTVLCOPT:http-cookie=tstc=p\n`;
        }
        m3uContent += `${streamUrl}\n`;

        const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `istream_${useProxy ? 'proxy' : 'direct'}.m3u`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      } catch (err) {
        window.location.href = `vlc://${streamUrl}`;
      }
    }
  };

  const handleOpenMx = async (useProxy = false) => {
    pauseVideo();
    const { directUrl, proxyUrl } = await fetchStreamUrls();
    const streamUrl = useProxy ? proxyUrl : directUrl;
    if (!streamUrl) return;

    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    if (!isAndroid) {
      toastSuccess('MX Player intents are supported on Android devices. Use VLC on Desktop.');
      return;
    }

    if (useProxy) {
      window.location.href = `intent:${streamUrl}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;S.title=${encodeURIComponent((title || 'iStream') + ' (Proxy)')};end`;
    } else {
      const headers = 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\nCookie: tstc=p';
      window.location.href = `intent:${streamUrl}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;S.title=${encodeURIComponent((title || 'iStream') + ' (Direct)')};S.headers=${encodeURIComponent(headers)};end`;
    }
  };

  const handleCopyLink = async (useProxy = false) => {
    const { directUrl, proxyUrl } = await fetchStreamUrls();
    const streamUrl = useProxy ? proxyUrl : directUrl;
    if (!streamUrl) return;

    navigator.clipboard.writeText(streamUrl).then(() => {
      toastSuccess(useProxy ? 'Copied Proxied Stream URL (VPS)!' : 'Copied Direct CDN Stream URL!');
    });
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || secs < 0) return '00:00:00';
    const totalSecs = Math.floor(secs);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onTouchMove={handleUserActivity}
      onMouseLeave={() => isPlaying && !activeMenu && setShowControls(false)}
      className={`relative w-full aspect-video bg-black rounded-2xl ${activeMenu ? 'overflow-visible' : 'overflow-hidden'} shadow-2xl group select-none border border-white/5`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        poster={poster}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (v) {
            setDuration(v.duration || 0);
          }
          updateDetectedTracks();
        }}
        onLoadedData={updateDetectedTracks}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v) return;
          setCurrentTime(v.currentTime || 0);
        }}
        onPlay={() => {
          setIsPlaying(true);
          updateDetectedTracks();
          if (!hasLoggedPlayRef.current) {
            console.log(
              `[IStreamPlayer] Playback Started | Title: "${title || mediaId || 'Media'}" | Proxy: ALWAYS ON (Type: ${
                isLiveTv ? 'Live TV' : 'DASH Movie/Series'
              })`
            );
            hasLoggedPlayRef.current = true;
          }
        }}
        onPause={() => setIsPlaying(false)}
        onError={() => setHasError(true)}
        className="w-full h-full object-contain cursor-pointer rounded-2xl"
        playsInline
      />

      {/* Screen Click Area */}
      <div onClick={handleScreenClick} className="absolute inset-0 z-0 cursor-pointer" />

      {/* Double Tap Ripple Animations */}
      {doubleTapFeedback && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 pointer-events-none z-20 flex flex-col items-center justify-center w-24 h-24 rounded-full bg-blue-600/40 text-white backdrop-blur-md animate-ping ${
            doubleTapFeedback.side === 'left' ? 'left-12' : 'right-12'
          }`}
        >
          {doubleTapFeedback.side === 'left' ? <RotateCcw size={28} /> : <RotateCw size={28} />}
          <span className="text-xs font-bold mt-1">{doubleTapFeedback.text}</span>
        </div>
      )}

      {/* Error State Overlay (Behind Controls at z-[5]) */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-darkbg/90 p-6 text-center z-[5] rounded-2xl">
          <p className="text-red-400 font-bold mb-4">Unable to reach media server</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setHasError(false);
                videoRef.current?.load();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-lg"
            >
              Retry Playback
            </button>
            {safeSrc && (
              <a
                href={safeSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-surface-elevated hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-white/10 transition shadow-lg"
              >
                <ExternalLink size={13} />
                <span>Open Stream URL</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Center Play Button when Paused */}
      {!isPlaying && !hasError && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30 pointer-events-none"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-md transform hover:scale-110 transition duration-200">
            <Play size={32} className="fill-current ml-1" />
          </div>
        </div>
      )}

      {/* Video Title Header Overlay */}
      <div
        className={`absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent transition-opacity duration-300 pointer-events-none z-10 flex items-center justify-between ${
          showControls || hasError ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <h4 className="text-xs sm:text-sm font-semibold text-white truncate max-w-[60%] sm:max-w-[70%] drop-shadow-md">
          {title}
        </h4>

        {/* Quick External App Button */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => setActiveMenu(activeMenu === 'players' ? null : 'players')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border backdrop-blur-md transition shadow-md ${
              activeMenu === 'players'
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-black/60 hover:bg-black/90 text-gray-200 hover:text-white border-white/15'
            }`}
          >
            <Tv size={13} className="text-blue-400" />
            <span>Open in App</span>
          </button>
        </div>
      </div>

      {/* External Players Menu */}
      {activeMenu === 'players' && (
        <div
          className="fixed inset-0 sm:absolute sm:inset-auto sm:top-14 sm:right-4 z-[60] bg-black/75 sm:bg-transparent flex flex-col justify-end sm:block p-3 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none"
          onClick={() => setActiveMenu(null)}
        >
          <div
            className="w-full sm:w-80 max-h-[85vh] overflow-y-auto glass-dropdown rounded-3xl sm:rounded-2xl shadow-2xl p-3 sm:p-3.5 bg-darkbg border border-gray-700 animate-fade-in no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10 mb-2 sticky top-0 bg-darkbg backdrop-blur-md z-10">
              <span className="text-xs sm:text-[11px] font-bold text-gray-300 uppercase tracking-wider">Open in External App</span>
              <button onClick={() => setActiveMenu(null)} className="text-xs sm:text-[10px] text-gray-400 hover:text-white px-2 py-0.5 rounded-lg bg-white/5">Close</button>
            </div>

            <div className="space-y-3 pt-0.5">
              {/* Direct CDN Streams Section */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 block">Direct CDN Stream</span>
                <button
                  onClick={() => { setActiveMenu(null); handleOpenMx(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 bg-white/5 rounded-xl transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Tv size={14} className="text-sky-400" />
                    <span className="font-semibold">MX Player (Direct)</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Android</span>
                </button>

                <button
                  onClick={() => { setActiveMenu(null); handleOpenVlc(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 bg-white/5 rounded-xl transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Tv size={14} className="text-orange-400" />
                    <span className="font-semibold">VLC Player (Direct)</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Desktop / Mobile</span>
                </button>
              </div>

              {/* Proxied Streams Section (VPS Proxy) */}
              <div className="space-y-1.5 border-t border-white/10 pt-2">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">VPS Proxy Server</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-semibold">Recommended</span>
                </div>
                <button
                  onClick={() => { setActiveMenu(null); handleOpenMx(true); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-amber-500/20 bg-amber-500/10 border border-amber-500/20 rounded-xl transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Tv size={14} className="text-sky-400" />
                    <span className="font-semibold">MX Player (Proxy)</span>
                  </div>
                  <span className="text-[10px] text-amber-400">VPS Fast</span>
                </button>

                <button
                  onClick={() => { setActiveMenu(null); handleOpenVlc(true); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-amber-500/20 bg-amber-500/10 border border-amber-500/20 rounded-xl transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Tv size={14} className="text-orange-400" />
                    <span className="font-semibold">VLC Player (Proxy)</span>
                  </div>
                  <span className="text-[10px] text-amber-400">VPS Fast</span>
                </button>
              </div>

              {/* Copy Links Section */}
              <div className="border-t border-white/10 pt-2 space-y-1">
                <button
                  onClick={() => { handleCopyLink(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center gap-2"
                >
                  <Copy size={13} className="text-gray-400" />
                  <span>Copy Direct CDN Stream Link</span>
                </button>
                <button
                  onClick={() => { handleCopyLink(true); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-amber-300 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center gap-2"
                >
                  <Copy size={13} className="text-amber-400" />
                  <span>Copy Proxied Stream Link (VPS)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Dialog Modal */}
      {activeMenu === 'settings' && (
        <div
          className="fixed inset-0 sm:absolute sm:inset-auto sm:bottom-16 sm:right-4 z-[60] bg-black/75 sm:bg-transparent flex flex-col justify-end sm:block p-3 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none"
          onClick={() => setActiveMenu(null)}
        >
          <div
            className="w-full sm:w-64 max-h-[82vh] overflow-y-auto glass-dropdown rounded-3xl sm:rounded-2xl shadow-2xl p-3 sm:p-2.5 bg-darkbg border border-gray-700 animate-fade-in no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10 mb-2 sticky top-0 bg-darkbg backdrop-blur-md z-10">
              <span className="text-xs sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Playback Settings</span>
              <button onClick={() => setActiveMenu(null)} className="text-xs sm:text-[10px] text-gray-400 hover:text-white px-2 py-0.5 rounded-lg bg-white/5">Close</button>
            </div>

            <div className="space-y-1.5 pt-0.5">
              <button
                onClick={() => setActiveMenu('speed')}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Sliders size={14} className="text-blue-400" />
                  <span>Speed</span>
                </span>
                <span className="text-gray-400 font-mono text-[11px]">{playbackRate}x</span>
              </button>

              <button
                onClick={() => {
                  setActiveMenu(null);
                  handleCast();
                }}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Cast size={14} className="text-amber-400" />
                  <span>Cast to TV</span>
                </span>
                <span className="text-amber-400 text-[11px]">AirPlay / Cast</span>
              </button>

              <button
                onClick={() => setActiveMenu('subtitles')}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Subtitles size={14} className="text-emerald-400" />
                  <span>Captions</span>
                </span>
                <span className="text-gray-400 text-[11px]">
                  {currentSubtitleTrack === -1
                    ? 'Off'
                    : subtitleTracks.find((t) => t.id === currentSubtitleTrack)?.name || 'On'}
                </span>
              </button>

              <button
                onClick={() => setActiveMenu('quality')}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Sliders size={14} className="text-purple-400" />
                  <span>Resolution</span>
                </span>
                <span className="text-gray-400 text-[11px]">
                  {currentHlsQuality === -1
                    ? 'Auto'
                    : hlsQualities.find((q) => q.index === currentHlsQuality)?.label || 'Selected'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Speed Submenu */}
      {activeMenu === 'speed' && (
        <div
          className="fixed inset-0 sm:absolute sm:inset-auto sm:bottom-16 sm:right-4 z-[60] bg-black/75 sm:bg-transparent flex flex-col justify-end sm:block p-3 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none"
          onClick={() => setActiveMenu(null)}
        >
          <div
            className="w-full sm:w-56 max-h-[82vh] overflow-y-auto glass-dropdown rounded-3xl sm:rounded-2xl shadow-2xl p-3 sm:p-2 bg-darkbg border border-gray-700 animate-fade-in no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 mb-1 sticky top-0 bg-darkbg backdrop-blur-md z-10">
              <span className="text-xs sm:text-[10px] font-bold text-gray-400 uppercase">Speed</span>
              <button onClick={() => setActiveMenu('settings')} className="text-xs sm:text-[10px] text-blue-400 hover:underline">
                Back
              </button>
            </div>
            <div className="space-y-1 pt-1">
              {speedOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center justify-between ${
                    playbackRate === s ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <span>{s === 1.0 ? '1.0x (Normal)' : `${s}x`}</span>
                  {playbackRate === s && <Check size={13} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quality Submenu */}
      {activeMenu === 'quality' && (
        <div
          className="fixed inset-0 sm:absolute sm:inset-auto sm:bottom-16 sm:right-4 z-[60] bg-black/75 sm:bg-transparent flex flex-col justify-end sm:block p-3 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none"
          onClick={() => setActiveMenu(null)}
        >
          <div
            className="w-full sm:w-60 max-h-[82vh] overflow-y-auto glass-dropdown rounded-3xl sm:rounded-2xl shadow-2xl p-3 sm:p-2 bg-darkbg border border-gray-700 animate-fade-in no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 mb-1 sticky top-0 bg-darkbg backdrop-blur-md z-10">
              <span className="text-xs sm:text-[10px] font-bold text-gray-400 uppercase">Resolution</span>
              <button onClick={() => setActiveMenu('settings')} className="text-xs sm:text-[10px] text-blue-400 hover:underline">
                Back
              </button>
            </div>
            <div className="space-y-1 pt-1">
              <button
                onClick={() => handleHlsQualitySelect(-1)}
                className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center justify-between ${
                  currentHlsQuality === -1 ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span>Auto (Adaptive)</span>
                {currentHlsQuality === -1 && <Check size={13} />}
              </button>
              {hlsQualities.map((q) => (
                <button
                  key={q.index}
                  onClick={() => handleHlsQualitySelect(q.index)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center justify-between ${
                    currentHlsQuality === q.index ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <span>{q.label}</span>
                  {currentHlsQuality === q.index && <Check size={13} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subtitles Submenu */}
      {activeMenu === 'subtitles' && (
        <div
          className="fixed inset-0 sm:absolute sm:inset-auto sm:bottom-16 sm:right-4 z-[60] bg-black/75 sm:bg-transparent flex flex-col justify-end sm:block p-3 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none"
          onClick={() => setActiveMenu(null)}
        >
          <div
            className="w-full sm:w-60 max-h-[82vh] overflow-y-auto glass-dropdown rounded-3xl sm:rounded-2xl shadow-2xl p-3 sm:p-2 bg-darkbg border border-gray-700 animate-fade-in no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 mb-1 sticky top-0 bg-darkbg backdrop-blur-md z-10">
              <span className="text-xs sm:text-[10px] font-bold text-gray-400 uppercase">Captions</span>
              <button onClick={() => setActiveMenu('settings')} className="text-xs sm:text-[10px] text-blue-400 hover:underline">
                Back
              </button>
            </div>
            <div className="space-y-1 pt-1">
              <button
                onClick={() => handleSubtitleTrackSelect(-1)}
                className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center justify-between ${
                  currentSubtitleTrack === -1 ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span>Off</span>
                {currentSubtitleTrack === -1 && <Check size={13} />}
              </button>
              {subtitleTracks.map((st) => (
                <button
                  key={st.id}
                  onClick={() => handleSubtitleTrackSelect(st)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-xl transition flex items-center justify-between ${
                    currentSubtitleTrack === st.id ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <span>{st.name}</span>
                  {currentSubtitleTrack === st.id && <Check size={13} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 z-10 ${
          showControls || hasError ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div
          ref={progressContainerRef}
          onMouseDown={handleSeekPointerDown}
          onTouchStart={handleSeekPointerDown}
          className="relative w-full h-3 sm:h-2 py-1 flex items-center cursor-pointer mb-2 group/progress touch-none select-none"
        >
          <div className="w-full h-1 sm:h-1.5 group-hover/progress:h-2 bg-gray-600/60 rounded-full transition-all relative overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-75"
              style={{
                width: `${
                  duration > 0
                    ? ((isDraggingSeek ? dragCurrentTime : currentTime) / duration) * 100
                    : 0
                }%`,
              }}
            />
          </div>
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-3 sm:h-3 bg-white rounded-full shadow-lg transform -translate-x-1/2 transition-all ${
              isDraggingSeek ? 'opacity-100 scale-125' : 'opacity-0 group-hover/progress:opacity-100'
            }`}
            style={{
              left: `${
                duration > 0
                  ? ((isDraggingSeek ? dragCurrentTime : currentTime) / duration) * 100
                  : 0
              }%`,
            }}
          />
          {isDraggingSeek && (
            <div
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-black/90 text-white text-[10px] font-mono font-bold shadow pointer-events-none border border-white/20"
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
        <div className="flex items-center justify-between text-white text-sm">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <button onClick={togglePlay} className="hover:text-blue-400 transition" title="Play/Pause (Space)">
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              onClick={() => seek(currentTime - 10)}
              className="hover:text-blue-400 transition text-gray-300 hidden sm:block"
              title="Seek -10s"
            >
              <RotateCcw size={17} />
            </button>
            <button
              onClick={() => seek(currentTime + 10)}
              className="hover:text-blue-400 transition text-gray-300 hidden sm:block"
              title="Seek +10s"
            >
              <RotateCw size={17} />
            </button>

            <div className="hidden sm:flex items-center gap-1.5 group/vol">
              <button onClick={toggleMute} className="hover:text-blue-400 transition" title="Mute (M)">
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-14 sm:w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>

            <span className="text-[11px] sm:text-xs text-gray-300 font-mono ml-1 sm:ml-2">
              <span className="sm:hidden">{formatTime(currentTime)}</span>
              <span className="hidden sm:inline">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => setActiveMenu(activeMenu === 'quality' ? null : 'quality')}
              className={`px-2 py-1 sm:px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition ${
                activeMenu === 'quality'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 hover:bg-white/20 text-gray-200'
              }`}
              title="Select Resolution"
            >
              <Sliders size={13} className="text-purple-400 flex-shrink-0" />
              <span className="font-semibold text-xs">
                {currentHlsQuality === -1
                  ? 'Auto'
                  : hlsQualities.find((q) => q.index === currentHlsQuality)?.label || 'Auto'}
              </span>
            </button>

            {isPipSupported && (
              <button
                onClick={togglePip}
                className={`p-1.5 rounded-xl transition ${
                  isPipActive ? 'text-blue-400 bg-white/15' : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
                title="Picture in Picture (P)"
              >
                <PictureInPicture2 size={18} />
              </button>
            )}

            <button
              onClick={() => setActiveMenu(activeMenu === 'settings' ? null : 'settings')}
              className={`p-1.5 rounded-xl transition ${
                activeMenu === 'settings' ? 'text-blue-400 bg-white/15' : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Playback Settings"
            >
              <Settings size={18} />
            </button>



            <button
              onClick={toggleFullscreen}
              className="hover:text-blue-400 transition ml-0.5 p-1.5 rounded-xl hover:bg-white/10"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IStreamPlayer;
