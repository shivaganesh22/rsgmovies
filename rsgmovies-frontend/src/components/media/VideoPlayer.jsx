import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Hls from 'hls.js';
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
  Cast,
  Subtitles,
  Gauge,
  Sliders,
  Copy,
  Check,
  Radio,
  Tv,
  Layers,
  PictureInPicture2,
} from 'lucide-react';
import { toastSuccess } from '../ui/Notifications';
import { saveWatchProgress } from '../../utils/watchHistory';

export const VideoPlayer = ({
  src,
  poster,
  title,
  qualities = [],
  onQualityChange,
  currentQuality,
  languages = [],
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
  const clickTimerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const doubleClickCountRef = useRef(0);
  const lastSaveRef = useRef(0);
  const initialSeekDoneRef = useRef(false);

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

  // Menus: 'settings', 'players', 'audio', 'subtitles', 'speed', 'streams'
  const [activeMenu, setActiveMenu] = useState(null);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState(null);

  // Dynamic HLS & Video Tracks
  const [hlsQualities, setHlsQualities] = useState([]);
  const [currentHlsQuality, setCurrentHlsQuality] = useState(-1);
  const [audioTracks, setAudioTracks] = useState([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Safe stream URL handling
  const safeSrc = useMemo(() => {
    if (!src) return '';
    let url = src;
    if (url.startsWith('http://') && window.location.protocol === 'https:') {
      url = url.replace('http://', 'https://');
    }
    return url;
  }, [src]);

  // Selected stream label for bottom bar
  const selectedStreamLabel = useMemo(() => {
    if (currentQuality) {
      return `${currentQuality.server || currentQuality.video_name || 'Server 1'}${currentQuality.lang ? ` (${currentQuality.lang})` : ''}`;
    }
    return '1080p Stream';
  }, [currentQuality]);

  // Short quality / stream label for mobile space (max 5 characters)
  const shortStreamLabel = useMemo(() => {
    if (currentQuality) {
      const q = currentQuality.video_name || currentQuality.quality || '';
      const s = currentQuality.server || '';
      const l = currentQuality.lang || '';
      if (q) return q.substring(0, 5);
      if (s) {
        const sClean = s.replace(/Server\s*/i, 'S');
        return (l ? `${sClean}${l.substring(0, 2)}` : sClean).substring(0, 5);
      }
      if (l) return l.substring(0, 5);
    }
    return '1080p';
  }, [currentQuality]);
  const updateDetectedTracks = useCallback(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;

    // 1. Audio Tracks Detection
    if (hls && hls.audioTracks && hls.audioTracks.length > 0) {
      setAudioTracks(
        hls.audioTracks.map((t, idx) => ({
          id: idx,
          name: t.name || t.lang || `Audio Track ${idx + 1}`,
          lang: t.lang || '',
          type: 'hls',
        }))
      );
      setCurrentAudioTrack(hls.audioTrack);
    } else if (video && video.audioTracks && video.audioTracks.length > 0) {
      const natAudios = Array.from(video.audioTracks).map((t, idx) => ({
        id: idx,
        name: t.label || t.language || `Audio ${idx + 1}`,
        lang: t.language || '',
        type: 'native',
      }));
      setAudioTracks(natAudios);
    }

    // 2. Subtitle / Caption Tracks Detection
    if (hls && hls.subtitleTracks && hls.subtitleTracks.length > 0) {
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
          name: t.label || t.language || `Subtitle ${idx + 1}`,
          lang: t.language || '',
          type: 'native',
        }));
      if (natSubs.length > 0) {
        setSubtitleTracks(natSubs);
      }
    }
  }, []);

  // Initialize Video & HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !safeSrc) return;

    setHasError(false);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = safeSrc.includes('.m3u8') || safeSrc.includes('/hls/');

    if (isHls && Hls.isSupported()) {
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

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        if (hls.levels && hls.levels.length > 0) {
          const levels = hls.levels.map((lvl, index) => ({
            index,
            height: lvl.height || 0,
            bitrate: lvl.bitrate || 0,
            label: lvl.height ? `${lvl.height}p` : `Stream ${index + 1}`,
          }));
          setHlsQualities(levels);
        }

        if (initialTime && Number(initialTime) > 0) {
          try {
            video.currentTime = Number(initialTime);
            setCurrentTime(Number(initialTime));
          } catch (e) {}
        }

        updateDetectedTracks();
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        updateDetectedTracks();
      });

      hls.on(Hls.Events.AUDIO_TRACK_LOADED, () => {
        updateDetectedTracks();
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        updateDetectedTracks();
      });

      hls.on(Hls.Events.SUBTITLE_TRACK_LOADED, () => {
        updateDetectedTracks();
      });

      hls.on(Hls.Events.LEVEL_LOADED, () => {
        updateDetectedTracks();
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.warn('HLS Error encountered:', data);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              // Fallback to native video element if HLS fails
              hls.destroy();
              hlsRef.current = null;
              if (video) {
                video.src = safeSrc;
                video.load();
                video.play().catch(() => {});
              }
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else {
      video.src = safeSrc;
      video.load();
      if (initialTime && Number(initialTime) > 0) {
        try {
          video.currentTime = Number(initialTime);
          setCurrentTime(Number(initialTime));
        } catch (e) {}
      }
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [safeSrc, updateDetectedTracks]);

  // Auto-hide controls effect whenever showControls is true and video is playing
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

  // Drag Seek Scrubbing (Mouse + Touch)
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

  // Gestures:
  // 1. Single tap on center (30% to 70%) -> Pause or Resume
  // 2. Single tap on left / right (< 30% or > 70%) -> Show or Hide controls
  // 3. Double tap on center (30% to 70%) -> Fullscreen
  // 4. Double tap on left (< 30%) -> Seek backward 10s
  // 5. Double tap on right (> 70%) -> Seek forward 10s
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
          // Center: Single tap pause or resume
          togglePlay();
        } else {
          // Left or Right: Single tap show or hide controls
          setShowControls((prev) => !prev);
        }
        doubleClickCountRef.current = 0;
      }, 250);
    } else if (doubleClickCountRef.current === 2) {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      doubleClickCountRef.current = 0;

      if (clickRatio < 0.30) {
        // Double tap left -> seek backward 10s
        seek((videoRef.current?.currentTime || 0) - 10);
        setDoubleTapFeedback({ side: 'left', text: '-10s' });
        setTimeout(() => setDoubleTapFeedback(null), 750);
      } else if (clickRatio > 0.70) {
        // Double tap right -> seek forward 10s
        seek((videoRef.current?.currentTime || 0) + 10);
        setDoubleTapFeedback({ side: 'right', text: '+10s' });
        setTimeout(() => setDoubleTapFeedback(null), 750);
      } else {
        // Double tap center -> fullscreen
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
    if (hlsRef.current) {
      hlsRef.current.currentLevel = qualityIndex;
      setCurrentHlsQuality(qualityIndex);
      setActiveMenu(null);
    }
  };

  const handleAudioTrackSelect = (track, streamOption = null) => {
    if (streamOption && onQualityChange) {
      onQualityChange(streamOption);
      setActiveMenu(null);
      return;
    }
    const hls = hlsRef.current;
    const video = videoRef.current;
    if (track && track.type === 'hls' && hls) {
      hls.audioTrack = track.id;
      setCurrentAudioTrack(track.id);
    } else if (track && track.type === 'native' && video && video.audioTracks) {
      for (let i = 0; i < video.audioTracks.length; i++) {
        video.audioTracks[i].enabled = i === track.id;
      }
      setCurrentAudioTrack(track.id);
    }
    setActiveMenu(null);
  };

  const handleSubtitleTrackSelect = (track) => {
    const hls = hlsRef.current;
    const video = videoRef.current;
    if (!track || track === -1) {
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
    } else if (track.type === 'hls' && hls) {
      hls.subtitleTrack = track.id;
      hls.subtitleDisplay = true;
      setCurrentSubtitleTrack(track.id);
    } else if (track.type === 'native' && video && video.textTracks) {
      Array.from(video.textTracks).forEach((t, i) => {
        t.mode = i === track.id ? 'showing' : 'disabled';
      });
      setCurrentSubtitleTrack(track.id);
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
        // Automatically rotate / lock to landscape on mobile devices if supported
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
      toastSuccess('Cast: Ensure Chromecast or Smart TV is connected to the same Wi-Fi.');
    }
  };

  const pauseVideo = () => {
    const video = videoRef.current;
    if (video && !video.paused) {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleOpenVlc = (e) => {
    e.preventDefault();
    pauseVideo();
    if (!safeSrc) return;
    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isAndroid) {
      window.location.href = `intent:${safeSrc}#Intent;package=org.videolan.vlc;type=video/*;end`;
    } else if (isIOS) {
      window.location.href = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(safeSrc)}`;
    } else {
      // Desktop: Generate M3U stream file for instant 1-click VLC / Media Player launching on Windows/Mac
      try {
        const streamTitle = (title || 'Stream').replace(/[\r\n]/g, ' ');
        const m3uContent = `#EXTM3U\n#EXTINF:-1,${streamTitle}\n${safeSrc}\n`;
        const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${streamTitle.replace(/[^a-zA-Z0-9_-]/g, '_') || 'video'}.m3u`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        toastSuccess('Stream playlist downloaded — open with VLC Media Player!');
      } catch (err) {
        window.location.href = `vlc://${safeSrc}`;
      }
    }
  };

  const copyStreamUrl = () => {
    if (safeSrc) {
      navigator.clipboard.writeText(safeSrc).then(() => {
        setCopiedUrl(true);
        toastSuccess('Stream URL copied to clipboard!');
        setTimeout(() => setCopiedUrl(false), 3000);
      });
    }
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
            const dur = v.duration || 0;
            setDuration(dur);
            if (!initialSeekDoneRef.current && initialTime && Number(initialTime) > 0 && Number(initialTime) < (dur || 999999)) {
              try {
                v.currentTime = Number(initialTime);
                setCurrentTime(Number(initialTime));
                initialSeekDoneRef.current = true;
              } catch (e) {}
            }
          }
          updateDetectedTracks();
        }}
        onCanPlay={() => {
          const v = videoRef.current;
          if (v && !initialSeekDoneRef.current && initialTime && Number(initialTime) > 0) {
            try {
              v.currentTime = Number(initialTime);
              setCurrentTime(Number(initialTime));
              initialSeekDoneRef.current = true;
            } catch (e) {}
          }
        }}
        onLoadedData={updateDetectedTracks}
        onTimeUpdate={() => {
          const v = videoRef.current;
          if (!v) return;
          const ct = v.currentTime || 0;
          const dur = v.duration || duration || 0;
          setCurrentTime(ct);

          const now = Date.now();
          if (now - lastSaveRef.current > 3000) {
            lastSaveRef.current = now;
            if (mediaId && ct > 5 && dur > 0) {
              saveWatchProgress({
                id: mediaId,
                title,
                type: mediaType,
                poster_path: poster,
                currentTime: ct,
                duration: dur,
                season_number: seasonNumber,
                episode_number: episodeNumber,
                episode_name: episodeName,
                genre,
                genresname,
                rating,
                year,
                link: safeSrc,
                server: currentQuality?.server || currentQuality?.video_name || '',
                videoId: currentQuality?.id || '',
              });
            }
          }
        }}
        onPlay={() => {
          setIsPlaying(true);
          updateDetectedTracks();
        }}
        onPause={() => {
          setIsPlaying(false);
          const v = videoRef.current;
          if (v && mediaId && v.currentTime > 5 && (v.duration || duration) > 0) {
            saveWatchProgress({
              id: mediaId,
              title,
              type: mediaType,
              poster_path: poster,
              currentTime: v.currentTime,
              duration: v.duration || duration,
              season_number: seasonNumber,
              episode_number: episodeNumber,
              episode_name: episodeName,
              genre,
              genresname,
              rating,
              year,
              link: safeSrc,
              server: currentQuality?.server || currentQuality?.video_name || '',
              videoId: currentQuality?.id || '',
            });
          }
        }}
        onError={() => {
          if (!hlsRef.current && videoRef.current?.src) {
            setHasError(true);
          }
        }}
        className="w-full h-full object-contain cursor-pointer rounded-2xl"
        playsInline
      />

      {/* Screen Clickable Area with Double-Tap Detection */}
      <div
        onClick={handleScreenClick}
        className="absolute inset-0 z-0 cursor-pointer"
      />

      {/* Double Tap Ripple Animation Indicators */}
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

      {/* Error State Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-darkbg/90 p-6 text-center z-[5] rounded-2xl">
          <p className="text-red-400 font-bold mb-4">Unable to reach media server</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setHasError(false);
                videoRef.current?.load();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Retry Playback
            </button>
            {safeSrc && (
              <a
                href={safeSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-surface-elevated hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-white/10 transition"
              >
                <ExternalLink size={13} />
                <span>Open Stream URL</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Center Big Play Button when Paused */}
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

      {/* Video Title Header Overlay & Top-Right Actions (Cast + Open in App) */}
      <div
        className={`absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent transition-opacity duration-300 pointer-events-none z-10 flex items-center justify-between ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <h4 className="text-xs sm:text-sm font-semibold text-white truncate max-w-[60%] sm:max-w-[70%] drop-shadow-md">
          {title}
        </h4>

        {/* Top-Right Quick Action Buttons (Open in App) */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Open in App Button */}
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

      {/* External 3rd Party Players Menu (Mobile Fullscreen Sheet / Desktop Glass Dropdown) */}
      {activeMenu === 'players' && safeSrc && (
        <div
          className="fixed inset-0 sm:absolute sm:inset-auto sm:top-14 sm:right-4 z-[60] bg-black/75 sm:bg-transparent flex flex-col justify-end sm:block p-3 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none"
          onClick={() => setActiveMenu(null)}
        >
          <div
            className="w-full sm:w-72 max-h-[82vh] overflow-y-auto glass-dropdown rounded-3xl sm:rounded-2xl shadow-2xl p-3 sm:p-2.5 bg-darkbg border border-gray-700 animate-fade-in no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10 mb-2 sticky top-0 bg-darkbg backdrop-blur-md z-10">
              <span className="text-xs sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">External Players</span>
              <button onClick={() => setActiveMenu(null)} className="text-xs sm:text-[10px] text-gray-400 hover:text-white px-2 py-0.5 rounded-lg bg-white/5">Close</button>
            </div>

            <div className="space-y-1.5 pt-0.5">
              {/* VLC Player */}
              <button
                onClick={(e) => {
                  handleOpenVlc(e);
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-2.5 sm:py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center gap-2.5"
              >
                <div className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-black text-xs flex-shrink-0">
                  V
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block text-white text-xs sm:text-[11px]">VLC Media Player</span>
                  <span className="text-[10px] text-gray-400">Direct intent (Mobile) / Playlist (PC)</span>
                </div>
              </button>

              {/* MX Player */}
              <a
                href={`intent:${safeSrc}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;end`}
                onClick={() => setActiveMenu(null)}
                className="w-full text-left px-3 py-2.5 sm:py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center gap-2.5"
              >
                <div className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xs flex-shrink-0">
                  M
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block text-white text-xs sm:text-[11px]">MX Player</span>
                  <span className="text-[10px] text-gray-400">Android Intent playback</span>
                </div>
              </a>

              {/* PotPlayer */}
              <a
                href={`potplayer://${safeSrc}`}
                onClick={() => setActiveMenu(null)}
                className="w-full text-left px-3 py-2.5 sm:py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center gap-2.5"
              >
                <div className="w-7 h-7 sm:w-6 sm:h-6 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-black text-xs flex-shrink-0">
                  P
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold block text-white text-xs sm:text-[11px]">PotPlayer / KMPlayer</span>
                  <span className="text-[10px] text-gray-400">Desktop player launch</span>
                </div>
              </a>

              {/* Copy Link */}
              <button
                onClick={copyStreamUrl}
                className="w-full text-left px-3 py-2.5 sm:py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center gap-2.5 border-t border-white/10 mt-1 pt-2"
              >
                {copiedUrl ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-gray-400" />}
                <span>{copiedUrl ? 'Copied Stream URL' : 'Copy Direct Stream URL'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Streams Dropdown (Mobile Fullscreen Sheet / Desktop Glass Dropdown) */}
      {activeMenu === 'streams' && qualities && qualities.length > 0 && (
        <div
          className="fixed inset-0 sm:absolute sm:inset-auto sm:bottom-16 sm:right-16 z-[60] bg-black/75 sm:bg-transparent flex flex-col justify-end sm:block p-3 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none"
          onClick={() => setActiveMenu(null)}
        >
          <div
            className="w-full sm:w-64 max-h-[75vh] overflow-y-auto glass-dropdown rounded-3xl sm:rounded-2xl shadow-2xl p-3 sm:p-2.5 bg-darkbg border border-gray-700 animate-fade-in no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10 mb-2 sticky top-0 bg-darkbg backdrop-blur-md z-10">
              <span className="text-xs sm:text-[10px] font-bold text-gray-400 uppercase">Available Streams ({qualities.length})</span>
              <button onClick={() => setActiveMenu(null)} className="text-xs sm:text-[10px] text-gray-400 hover:text-white px-2 py-0.5 rounded-lg bg-white/5">Close</button>
            </div>
            <div className="space-y-1.5 pt-0.5">
              {qualities.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onQualityChange?.(q);
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-3 py-2.5 sm:py-2 text-xs rounded-xl transition flex items-center justify-between ${
                    currentQuality === q
                      ? 'text-blue-400 font-bold bg-blue-500/15 border border-blue-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div>
                    <span className="block font-semibold text-white">{q.server || q.video_name || `Server ${i + 1}`}</span>
                    {q.lang && <span className="text-[10px] text-gray-400">{q.lang}</span>}
                  </div>
                  {currentQuality === q && <Check size={14} className="text-blue-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (Speed, Cast, Quality) */}
      {activeMenu === 'settings' && (
        <div className="absolute bottom-16 right-4 w-60 glass-dropdown rounded-2xl shadow-2xl p-2.5 z-[60] bg-darkbg/95 border border-gray-700 animate-fade-in backdrop-blur-xl">
          <div className="flex items-center justify-between px-2.5 py-1 border-b border-white/10 mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Playback Settings</span>
            <button onClick={() => setActiveMenu(null)} className="text-[10px] text-gray-400 hover:text-white">Close</button>
          </div>

          <div className="space-y-1 pt-1">
            {/* Speed Option */}
            <button
              onClick={() => setActiveMenu('speed')}
              className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Gauge size={14} className="text-blue-400" />
                <span>Playback Speed</span>
              </span>
              <span className="text-gray-400 font-mono text-[11px]">{playbackRate}x</span>
            </button>

            {/* Cast to TV Option */}
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

            {/* HLS Resolution Level Option */}
            {hlsQualities.length > 0 && (
              <button
                onClick={() => setActiveMenu('quality')}
                className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Sliders size={14} className="text-purple-400" />
                  <span>Resolution</span>
                </span>
                <span className="text-gray-400 text-[11px]">
                  {currentHlsQuality === -1 ? 'Auto' : hlsQualities[currentHlsQuality]?.label || 'Selected'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Speed Submenu */}
      {activeMenu === 'speed' && (
        <div className="absolute bottom-16 right-4 w-48 glass-dropdown rounded-2xl shadow-2xl p-2 z-[60] bg-darkbg/95 border border-gray-700 animate-fade-in backdrop-blur-xl">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Speed</span>
            <button onClick={() => setActiveMenu('settings')} className="text-[10px] text-blue-400 hover:underline">
              Back
            </button>
          </div>
          <div className="space-y-0.5 pt-1.5">
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition flex items-center justify-between ${
                  playbackRate === s ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span>{s === 1.0 ? '1.0x (Normal)' : `${s}x`}</span>
                {playbackRate === s && <Check size={13} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quality Submenu */}
      {activeMenu === 'quality' && (
        <div className="absolute bottom-16 right-4 w-52 glass-dropdown rounded-2xl shadow-2xl p-2 z-[60] bg-darkbg/95 border border-gray-700 animate-fade-in backdrop-blur-xl">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Resolution</span>
            <button onClick={() => setActiveMenu('settings')} className="text-[10px] text-blue-400 hover:underline">
              Back
            </button>
          </div>
          <div className="space-y-0.5 pt-1.5">
            <button
              onClick={() => handleHlsQualitySelect(-1)}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition flex items-center justify-between ${
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
                className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition flex items-center justify-between ${
                  currentHlsQuality === q.index ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span>{q.label}</span>
                {currentHlsQuality === q.index && <Check size={13} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 z-10 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar (Click & Drag Scrubbing for Mouse & Touch) */}
        <div
          ref={progressContainerRef}
          onMouseDown={handleSeekPointerDown}
          onTouchStart={handleSeekPointerDown}
          className="relative w-full h-3 sm:h-2 py-1 flex items-center cursor-pointer mb-2 group/progress touch-none select-none"
        >
          {/* Background Track */}
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

          {/* Scrub Thumb Handle */}
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

          {/* Drag Time Scrub Tooltip */}
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
          {/* Left: Play/Pause, Seek, Volume (Hidden on mobile), Simplified Time */}
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

            {/* Volume (Hidden on Mobile) */}
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

            {/* Timestamp (Simple on mobile) */}
            <span className="text-[11px] sm:text-xs text-gray-300 font-mono ml-1 sm:ml-2">
              <span className="sm:hidden">{formatTime(currentTime)}</span>
              <span className="hidden sm:inline">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </span>
          </div>

          {/* Right: Streams Selector (5 chars on mobile), PiP, Settings, Download, Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Streams Button beside settings */}
            {qualities && qualities.length > 1 && (
              <button
                onClick={() => setActiveMenu(activeMenu === 'streams' ? null : 'streams')}
                className={`px-2 py-1 sm:px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition ${
                  activeMenu === 'streams'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-gray-200'
                }`}
                title="Select Stream / Server"
              >
                <Layers size={13} className="text-blue-400 flex-shrink-0" />
                <span className="hidden sm:inline truncate max-w-[120px]">{selectedStreamLabel}</span>
                <span className="sm:hidden text-[10px] font-bold">{shortStreamLabel.substring(0, 5)}</span>
              </button>
            )}

            {/* Picture-in-Picture (PiP) */}
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

            {/* Playback Settings Button */}
            <button
              onClick={() => setActiveMenu(activeMenu === 'settings' ? null : 'settings')}
              className={`p-1.5 rounded-xl transition ${
                activeMenu === 'settings' ? 'text-blue-400 bg-white/15' : 'text-gray-300 hover:text-white hover:bg-white/10'
              }`}
              title="Playback Settings"
            >
              <Settings size={18} />
            </button>

            {/* Download Video Button */}
            {safeSrc && (
              <a
                href={safeSrc}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="p-1.5 rounded-xl hover:bg-white/10 text-gray-300 hover:text-white transition hidden sm:flex items-center gap-1 text-xs"
                title="Download Video"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={16} />
              </a>
            )}

            {/* Fullscreen */}
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

export default VideoPlayer;
