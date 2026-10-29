import React, { useEffect, useRef, useState, useMemo } from 'react';
import 'movi-player';
import { getMovieboxProxyBase } from '../../api/moviebox';

export const MoviAdvancedPlayer = ({
  src,
  title = 'Seedr Video Stream',
  poster = '',
  remuxAudioTrack = null,
}) => {
  const playerRef = useRef(null);
  const [mediaInfo, setMediaInfo] = useState(null);
  const fetchedUrlRef = useRef(null);

  const proxyBase = useMemo(() => getMovieboxProxyBase(), []);

  // Compute stream URL
  const proxiedStreamUrl = useMemo(() => {
    if (!src) return '';
    const base = proxyBase.replace(/\/+$/, '');
    
    // Remux stream if specified
    if (remuxAudioTrack !== null && remuxAudioTrack !== undefined) {
      return `${base}/media/remux?url=${encodeURIComponent(src)}&audio=${remuxAudioTrack}`;
    }

    // Default byte-range stream proxy with CORS support
    if (src.includes('/stream?url=') || src.includes(':5000/stream')) {
      return src;
    }
    return `${base}/stream?url=${encodeURIComponent(src)}`;
  }, [src, remuxAudioTrack, proxyBase]);

  // Fetch server-extracted subtitles exactly once per media source
  useEffect(() => {
    if (!src || fetchedUrlRef.current === src) return;
    fetchedUrlRef.current = src;

    let isMounted = true;
    const base = proxyBase.replace(/\/+$/, '');
    const tracksApiUrl = `${base}/media/tracks?url=${encodeURIComponent(src)}`;

    fetch(tracksApiUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setMediaInfo(data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch server-extracted tracks from VPS proxy:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [src, proxyBase]);

  // Handle Pause: Stop pause-time background buffering and abort in-flight range fetches
  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;

    const stopLoadingOnPause = () => {
      const p = el.player;
      if (!p) return;

      try {
        // 1. Terminate background pause-time packet demux interval
        if (typeof p.stopPauseBuffering === 'function') {
          p.stopPauseBuffering();
        }
        // 2. Prevent player from re-arming pause-time buffering
        p.startPauseBuffering = () => {};

        // 3. Abort active network range stream reader so no remaining data is pulled while paused
        if (p.source && typeof p.source.stopStream === 'function') {
          p.source.stopStream();
        }
      } catch (err) {
        console.debug('Pause buffer handler:', err);
      }
    };

    const handlePlay = () => {
      const p = el.player;
      if (!p) return;
      try {
        if (typeof p.stopPauseBuffering === 'function') {
          p.stopPauseBuffering();
        }
      } catch (err) {
        console.debug('Play handler:', err);
      }
    };

    const handleStateChange = (e) => {
      if (e.detail === 'paused') {
        stopLoadingOnPause();
      }
    };

    el.addEventListener('pause', stopLoadingOnPause);
    el.addEventListener('play', handlePlay);
    el.addEventListener('statechange', handleStateChange);

    // Initialize player: disable pause-time polling upfront as soon as player engine is ready
    const pollTimer = setInterval(() => {
      if (el.player) {
        el.player.startPauseBuffering = () => {};
        clearInterval(pollTimer);
      }
    }, 150);

    return () => {
      clearInterval(pollTimer);
      el.removeEventListener('pause', stopLoadingOnPause);
      el.removeEventListener('play', handlePlay);
      el.removeEventListener('statechange', handleStateChange);
    };
  }, []);

  const subtitleTracks = mediaInfo?.subtitles || [];

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 group select-none">
      <movi-player
        ref={playerRef}
        key={proxiedStreamUrl}
        src={proxiedStreamUrl}
        title={title}
        poster={poster}
        controls=""
        autoplay=""
        playsinline=""
        preload="metadata"
        buffersize="32"
        ambientmode=""
        stablevolume=""
        cropbars=""
        showtitle=""
        crossorigin="anonymous"
        thumb=""
        fastseek="buttons keys gestures"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {/* Subtitles extracted from MKV container via VPS ffmpeg endpoint */}
        {subtitleTracks.map((sub, idx) => (
          <track
            key={sub.index ?? idx}
            kind="subtitles"
            src={
              sub.vtt_url?.startsWith('http')
                ? sub.vtt_url
                : `${proxyBase.replace(/\/+$/, '')}${sub.vtt_url}`
            }
            srcLang={sub.language || 'en'}
            label={sub.label || sub.title || `Subtitle ${idx + 1}`}
            default={idx === 0}
          />
        ))}
      </movi-player>
    </div>
  );
};

export default MoviAdvancedPlayer;
