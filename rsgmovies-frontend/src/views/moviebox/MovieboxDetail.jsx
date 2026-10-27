import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Film,
  Tv,
  Star,
  ChevronLeft,
  Calendar,
  Clock,
  Loader2,
  X,
  Server,
  Download,
  Copy,
  Check,
  ExternalLink,
  Volume2,
} from 'lucide-react';
import movieboxApi, { getProxiedStreamUrl, getProxiedDownloadUrl, MOVIEBOX_PROXY_BASE } from '../../api/moviebox';
import MovieboxPlayer from '../../components/media/MovieboxPlayer';
import Button from '../../components/ui/Button';
import { DetailSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { toastSuccess, toastWarning } from '../../components/ui/Notifications';

export const MovieboxDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const playerRef = useRef(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);

  // Series Season & Episode State
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);

  // Audio Dub State
  const [selectedDubId, setSelectedDubId] = useState(null);
  const [userSelectedDub, setUserSelectedDub] = useState(false);

  // Active Stream Selection State
  const [selectedStream, setSelectedStream] = useState(null);

  // Copy status
  const [copiedType, setCopiedType] = useState(null);

  // 1. Fetch Moviebox Item Details
  const {
    data: details,
    isLoading: detailsLoading,
    isError: detailsError,
    refetch: refetchDetails,
  } = useQuery({
    queryKey: ['movieboxDetails', id],
    queryFn: () => movieboxApi.getDetails(id),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
  });

  const isSeries = details?.subject_type === 2 || details?.type === 'Series';

  // 2. Fetch Episodes if Series
  const {
    data: episodesData,
    isLoading: episodesLoading,
  } = useQuery({
    queryKey: ['movieboxEpisodes', id],
    queryFn: () => movieboxApi.getEpisodes(id),
    enabled: Boolean(isSeries),
    staleTime: 1000 * 60 * 15,
  });

  const seasonsList = useMemo(() => {
    return Array.isArray(episodesData) ? episodesData : [];
  }, [episodesData]);

  // Set default season when seasons load
  useEffect(() => {
    if (seasonsList.length > 0) {
      setSelectedSeason(seasonsList[0].season || 1);
      setSelectedEpisode(1);
    }
  }, [seasonsList]);

  // Set default dub when details load
  const dubs = useMemo(() => {
    return Array.isArray(details?.dubs) ? details.dubs : [];
  }, [details?.dubs]);

  // Reset states when movie id changes
  useEffect(() => {
    setSelectedDubId(null);
    setUserSelectedDub(false);
    setIsPlayerOpen(false);
    setSelectedStream(null);
  }, [id]);

  // Set default dub when details load, prioritizing Telugu ("tel" / "telugu")
  useEffect(() => {
    if (userSelectedDub) return;

    if (dubs.length > 0) {
      // Prioritize Telugu dub if available ("tel" / "telugu")
      const teluguDub = dubs.find((d) => {
        const n = String(d.lang_name || d.language || d.name || d.title || '').toLowerCase();
        return n.includes('tel') || n.includes('telugu');
      });

      if (teluguDub) {
        setSelectedDubId(String(teluguDub.subject_id));
      } else {
        const match = dubs.find((d) => String(d.subject_id) === String(id));
        setSelectedDubId(match ? String(match.subject_id) : String(dubs[0].subject_id));
      }
    } else if (id) {
      setSelectedDubId(String(id));
    }
  }, [dubs, id, userSelectedDub]);

  // Target subject ID for streams call
  const targetSubjectId = selectedDubId || String(id);
  const reqSeason = isSeries ? selectedSeason : 0;
  const reqEpisode = isSeries ? selectedEpisode : 0;

  // 3. Fetch Streams for Target Dub & Season/Episode
  const {
    data: streamsResponse,
    isLoading: streamsLoading,
    isFetching: streamsFetching,
    refetch: fetchStreams,
  } = useQuery({
    queryKey: ['movieboxStreams', targetSubjectId, reqSeason, reqEpisode],
    queryFn: () => movieboxApi.getStreams(targetSubjectId, reqSeason, reqEpisode),
    enabled: isPlayerOpen || isStreamModalOpen,
    staleTime: 1000 * 60 * 10,
  });

  const streamsList = useMemo(() => {
    return Array.isArray(streamsResponse?.streams) ? streamsResponse.streams : [];
  }, [streamsResponse]);

  // Auto-select preferred stream
  useEffect(() => {
    if (streamsList.length > 0) {
      const preferred = streamsList.find((s) => s.quality_value === 1080) || streamsList[0];
      setSelectedStream(preferred);
    } else {
      setSelectedStream(null);
    }
  }, [streamsList]);

  const handleWatchClick = () => {
    setIsPlayerOpen(true);
    fetchStreams();
    setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const handleDubChange = (dubSubjectId) => {
    setUserSelectedDub(true);
    setSelectedDubId(String(dubSubjectId));
  };

  const handleEpisodeSelect = (epNum) => {
    setSelectedEpisode(epNum);
    setIsPlayerOpen(true);
    setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  // External App Launchers
  const getStreamUrls = (st = selectedStream) => {
    if (!st) return { direct: '', proxy: '', headers: {} };
    const raw = st.url || '';
    const h = { ...(st.headers || {}) };
    if (st.cookie) {
      h['Cookie'] = st.cookie;
    }
    const proxied = getProxiedStreamUrl(raw, h);
    return { direct: raw, proxy: proxied, headers: h };
  };

  const handleOpenVlc = (isProxy = false) => {
    const { direct, proxy, headers } = getStreamUrls();
    const target = isProxy ? proxy : direct;
    if (!target) {
      toastWarning('Please select an active stream first.');
      return;
    }

    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isAndroid) {
      const referer = headers['Referer'] || 'https://sflix.film/';
      const ua = headers['User-Agent'] || 'Mozilla/5.0';
      const extraHeaders = `--http-referrer=${referer};--http-user-agent=${ua}`;
      const intentUri = `intent:${target}#Intent;package=org.videolan.vlc;type=video/*;S.extra_headers=${encodeURIComponent(extraHeaders)};end`;
      window.location.href = intentUri;
    } else if (isIOS) {
      window.location.href = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(target)}`;
    } else {
      try {
        let m3u = `#EXTM3U\n#EXTINF:-1,${details?.title || 'Moviebox Stream'}\n`;
        if (headers['User-Agent']) m3u += `#EXTVLCOPT:http-user-agent=${headers['User-Agent']}\n`;
        if (headers['Referer']) m3u += `#EXTVLCOPT:http-referrer=${headers['Referer']}\n`;
        m3u += `${target}\n`;
        const blob = new Blob([m3u], { type: 'audio/x-mpegurl;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${(details?.title || 'stream').replace(/[^a-zA-Z0-9]/g, '_')}_vlc.m3u`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        toastSuccess('Downloaded VLC Playlist (.m3u)!');
      } catch (e) {
        window.location.href = `vlc://${target}`;
      }
    }
  };

  const handleOpenMx = (isProxy = false) => {
    const { direct, proxy, headers } = getStreamUrls();
    const target = isProxy ? proxy : direct;
    if (!target) {
      toastWarning('Please select an active stream first.');
      return;
    }
    const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
    if (!isAndroid) {
      toastWarning('MX Player intents are only supported on Android. Use VLC on Desktop.');
      return;
    }
    const referer = headers['Referer'] || 'https://sflix.film/';
    const ua = headers['User-Agent'] || 'Mozilla/5.0';
    const hStr = `Referer:${encodeURIComponent(referer)}|User-Agent:${encodeURIComponent(ua)}`;
    window.location.href = `intent:${target}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;S.headers=${hStr};end`;
  };

  const handleCopyLink = (type) => {
    const { direct, proxy } = getStreamUrls();
    const link = type === 'proxy' ? proxy : direct;
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedType(type);
      toastSuccess(`Copied ${type === 'proxy' ? 'Proxied' : 'Direct'} Stream URL!`);
      setTimeout(() => setCopiedType(null), 3000);
    });
  };

  // Direct video download handler
  const handleDownload = (customStream = null) => {
    const targetStream =
      customStream ||
      streamsList.find((s) => s.format === 'MP4' && s.quality_value === 1080) ||
      streamsList.find((s) => s.format === 'MP4') ||
      selectedStream ||
      streamsList[0];

    if (!targetStream) {
      fetchStreams();
      setIsStreamModalOpen(true);
      toastWarning('Loading available streams for download...');
      return;
    }

    const { direct, headers } = getStreamUrls(targetStream);
    const cleanTitle = (details?.title || 'moviebox_video').replace(/[^\w\s.-]/gi, '').trim().replace(/\s+/g, '_');
    const filename = `${cleanTitle}.mp4`;
    const downloadTarget = getProxiedDownloadUrl(direct, headers, filename);

    if (!downloadTarget) {
      toastWarning('No download link available for this stream.');
      return;
    }

    const a = document.createElement('a');
    a.href = downloadTarget;
    a.setAttribute('download', filename);
    a.setAttribute('target', '_blank');
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
    }, 100);
    toastSuccess(`Starting download: ${cleanTitle}.mp4`);
  };

  if (detailsLoading) {
    return <DetailSkeleton />;
  }

  if (detailsError || !details) {
    return <ErrorState onRetry={refetchDetails} message="Could not load Moviebox details." />;
  }

  const title = details.title || 'Moviebox Title';
  const poster = details.cover || '';
  const backdrop = poster;
  const ratingNum = Number(details.imdb_rating || 0);
  const releaseYear = (details.release_date || '').substring(0, 4);
  const genres = details.genre ? details.genre.split(',').map((g) => g.trim()) : [];

  const currentSeasonObj = seasonsList.find((s) => s.season === selectedSeason);
  const episodeCount = currentSeasonObj?.episode_count || 1;

  return (
    <div className="space-y-8 animate-fade-in pb-16 text-left">
      {/* Embedded Video Player Section */}
      {isPlayerOpen && (
        <div ref={playerRef} className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 truncate max-w-[70%]">
              <Play size={16} className="text-amber-400 fill-current flex-shrink-0" />
              <span className="truncate">
                {title}
                {isSeries ? ` (S${selectedSeason} E${selectedEpisode})` : ''}
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsPlayerOpen(false)}>
                Close Player
              </Button>
            </div>
          </div>

          {streamsLoading || streamsFetching ? (
            <div className="w-full aspect-video bg-black rounded-3xl flex flex-col items-center justify-center space-y-3 border border-white/10 shadow-2xl">
              <Loader2 size={36} className="text-amber-500 animate-spin" />
              <p className="text-xs text-gray-300 font-medium">Fetching Moviebox stream sources...</p>
            </div>
          ) : selectedStream ? (
            <MovieboxPlayer
              stream={selectedStream}
              streams={streamsList}
              title={`${title}${isSeries ? ` S${selectedSeason}E${selectedEpisode}` : ''}`}
              poster={backdrop}
              onStreamChange={(st) => setSelectedStream(st)}
            />
          ) : (
            <div className="w-full aspect-video bg-surface-card rounded-3xl flex flex-col items-center justify-center p-6 border border-white/10 space-y-3 text-center">
              <p className="text-sm text-gray-300">No active stream sources returned for this title.</p>
              <Button variant="secondary" size="sm" onClick={() => fetchStreams()}>
                Retry Fetching Streams
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Main Movie Details Card */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl p-5 sm:p-8 md:p-10 bg-surface">
        {/* Blurred Backdrop */}
        {backdrop && (
          <div
            className="absolute inset-0 bg-cover bg-center filter brightness-[0.22] blur-[3px] pointer-events-none scale-105"
            style={{ backgroundImage: `url(${backdrop})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-darkbg via-darkbg/80 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-darkbg via-darkbg/85 to-transparent hidden md:block pointer-events-none" />

        {/* Layout: Poster Left, Details Right */}
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
          {/* Poster Column */}
          <div className="relative w-36 sm:w-48 md:w-56 lg:w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-surface flex-shrink-0 mx-auto md:mx-0">
            {poster ? (
              <img src={poster} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-500">
                <Film size={48} />
              </div>
            )}

            {/* Rating Badge on Poster */}
            {ratingNum > 0 && (
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-black/80 text-amber-400 backdrop-blur-sm border border-amber-400/20 shadow-md">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                {ratingNum.toFixed(1)}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-3.5 w-full">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-tight drop-shadow-md">
              {title}
            </h1>

            {/* Metadata Pills (Country removed per user request) */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-gray-300 font-medium">
              {releaseYear && (
                <span className="px-2.5 py-1 rounded-lg bg-surface-elevated text-gray-300 border border-white/5 flex items-center gap-1">
                  <Calendar size={12} />
                  {releaseYear}
                </span>
              )}
              {details.duration && (
                <span className="px-2.5 py-1 rounded-lg bg-surface-elevated text-gray-300 border border-white/5 flex items-center gap-1">
                  <Clock size={12} />
                  {details.duration}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {isSeries ? 'TV Series' : 'Movie'}
              </span>
            </div>

            {/* Genre Chips */}
            {genres.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                {genres.map((g, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl text-xs font-medium bg-surface-elevated text-gray-300 border border-white/10"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Actions Bar - Single Row on Mobile & Desktop, no awkward wrapping */}
            <div className="flex flex-nowrap items-center justify-center md:justify-start gap-2.5 pt-2 w-full overflow-x-auto no-scrollbar pb-1">
              <Button
                variant="primary"
                size="sm"
                onClick={handleWatchClick}
                icon={<Play size={14} className="fill-current flex-shrink-0" />}
                className="flex-shrink-0 whitespace-nowrap text-xs font-bold px-3.5 py-2.5 shadow-lg shadow-blue-500/20"
              >
                <span>{isSeries ? 'Watch Series' : 'Watch Movie'}</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsStreamModalOpen(true);
                  if (!streamsList.length) fetchStreams();
                }}
                icon={<Server size={14} className="flex-shrink-0 text-amber-400" />}
                className="flex-shrink-0 whitespace-nowrap text-xs font-semibold px-3.5 py-2.5"
              >
                <span>Streams & Apps</span>
              </Button>

              {/* <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownload()}
                icon={<Download size={14} className="flex-shrink-0" />}
                className="flex-shrink-0 whitespace-nowrap text-xs font-semibold px-3.5 py-2.5 text-emerald-400 hover:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <span>Download</span>
              </Button> */}
            </div>

            {/* Storyline */}
            {details.description && (
              <div className="text-left w-full pt-3 border-t border-white/10 space-y-1.5">
                <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Storyline</h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  {details.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audio Dubs / Language Selector */}
      {dubs.length > 0 && (
        <div className="rounded-3xl p-5 sm:p-6 bg-surface-card border border-white/10 shadow-xl space-y-3">
          <div className="flex items-center gap-2">
            <Volume2 size={18} className="text-amber-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">Available Audio / Dubs</h3>
            <span className="text-xs text-gray-400">({dubs.length} tracks)</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {dubs.map((dub, idx) => {
              const isSelected = String(dub.subject_id) === String(selectedDubId);
              return (
                <button
                  key={dub.subject_id || idx}
                  onClick={() => handleDubChange(dub.subject_id)}
                  className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl text-xs font-semibold transition border flex items-center gap-2 ${
                    isSelected
                      ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/20 font-bold'
                      : 'bg-surface-elevated text-gray-300 border-white/10 hover:border-amber-400/50 hover:bg-white/10'
                  }`}
                >
                  <span>{dub.lang_name || dub.language || `Audio ${idx + 1}`}</span>
                  {isSelected && <Check size={14} className="stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Series Seasons & Episodes Section */}
      {isSeries && (
        <div className="rounded-3xl p-5 sm:p-6 bg-surface-card border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Tv size={18} className="text-amber-400" />
              <h3 className="text-sm sm:text-base font-bold text-white">Episodes</h3>
            </div>
            {seasonsList.length > 1 && (
              <span className="text-xs text-gray-400">{seasonsList.length} Seasons</span>
            )}
          </div>

          {/* Season Selector Tabs */}
          {seasonsList.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {seasonsList.map((s) => (
                <button
                  key={s.season}
                  onClick={() => {
                    setSelectedSeason(s.season);
                    setSelectedEpisode(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    selectedSeason === s.season
                      ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-md'
                      : 'bg-surface-elevated text-gray-300 border-white/10 hover:border-white/20'
                  }`}
                >
                  Season {s.season}
                </button>
              ))}
            </div>
          )}

          {/* Episode Grid */}
          {episodesLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 size={28} className="text-amber-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {Array.from({ length: episodeCount }, (_, i) => i + 1).map((epNum) => {
                const isSelected = selectedEpisode === epNum;
                return (
                  <button
                    key={epNum}
                    onClick={() => handleEpisodeSelect(epNum)}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center space-y-1 border ${
                      isSelected
                        ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/30'
                        : 'bg-surface-elevated text-gray-300 border-white/10 hover:border-amber-400/50 hover:bg-white/10'
                    }`}
                  >
                    <Play size={11} className={isSelected ? 'fill-black' : 'fill-current text-gray-400'} />
                    <span>Ep {epNum}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stream Selection & App Launcher Modal */}
      {isStreamModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-darkbg border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl p-5 sm:p-6 relative space-y-4 max-h-[88vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-amber-400" />
                <h3 className="text-base font-bold text-white">Stream Servers & Apps</h3>
              </div>
              <button
                onClick={() => setIsStreamModalOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-white bg-white/5"
              >
                <X size={16} />
              </button>
            </div>

            {streamsLoading || streamsFetching ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Loader2 size={32} className="text-amber-500 animate-spin" />
                <p className="text-xs text-gray-300">Fetching high-speed stream sources...</p>
              </div>
            ) : streamsList.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-gray-300">No active stream servers found for this selection.</p>
                <Button variant="secondary" size="sm" onClick={() => fetchStreams()}>
                  Retry Fetching Streams
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Available Streams List */}
                <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
                  {streamsList.map((st, i) => {
                    const isSelected = selectedStream?.url === st.url;
                    return (
                      <div
                        key={i}
                        className={`w-full p-3 rounded-2xl border transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : 'bg-surface-elevated border-white/10 text-gray-200'
                        }`}
                      >
                        <div
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => {
                            setSelectedStream(st);
                            setIsPlayerOpen(true);
                            setIsStreamModalOpen(false);
                            setTimeout(() => {
                              playerRef.current?.scrollIntoView({ behavior: 'smooth' });
                            }, 150);
                          }}
                        >
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="truncate">
                            <span className="font-semibold text-xs text-white block truncate">
                              {st.quality || st.resolution_tag || `Stream ${i + 1}`} ({st.format})
                            </span>
                            <span className="text-[10px] text-gray-400 block truncate">
                              {st.source} {st.size_mb ? `• ${st.size_mb} MB` : ''} {st.codec ? `• ${st.codec}` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 ml-2">
                          {/* Quick download button for MP4 stream */}
                          {(st.format === 'MP4' || st.source === 'mp4') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(st);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 transition"
                              title="Download stream"
                            >
                              <Download size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedStream(st);
                              setIsPlayerOpen(true);
                              setIsStreamModalOpen(false);
                              setTimeout(() => {
                                playerRef.current?.scrollIntoView({ behavior: 'smooth' });
                              }, 150);
                            }}
                            className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition"
                            title="Play stream"
                          >
                            <Play size={14} className="fill-current" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* External App Launchers Grid */}
                <div className="pt-3 border-t border-white/10 space-y-2.5">
                  <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    External App Launchers
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenVlc(false)}
                      className="p-3 rounded-2xl bg-orange-600/20 border border-orange-500/30 text-orange-300 hover:bg-orange-600/30 text-left font-semibold text-xs flex items-center justify-between transition"
                    >
                      <span>VLC (Direct)</span>
                      <ExternalLink size={13} />
                    </button>
                    <button
                      onClick={() => handleOpenMx(false)}
                      className="p-3 rounded-2xl bg-sky-600/20 border border-sky-500/30 text-sky-300 hover:bg-sky-600/30 text-left font-semibold text-xs flex items-center justify-between transition"
                    >
                      <span>MX Player (Direct)</span>
                      <ExternalLink size={13} />
                    </button>
                    <button
                      onClick={() => handleOpenVlc(true)}
                      className="p-3 rounded-2xl bg-amber-600/20 border border-amber-500/30 text-amber-300 hover:bg-amber-600/30 text-left font-semibold text-xs flex items-center justify-between transition"
                    >
                      <span>VLC (Proxy)</span>
                      <ExternalLink size={13} />
                    </button>
                    <button
                      onClick={() => handleOpenMx(true)}
                      className="p-3 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30 text-left font-semibold text-xs flex items-center justify-between transition"
                    >
                      <span>MX Player (Proxy)</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>

                  {/* Copy Link Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleCopyLink('direct')}
                      className="flex-1 py-2 px-3 rounded-xl bg-surface-elevated border border-white/10 text-gray-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition"
                    >
                      {copiedType === 'direct' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                      <span>Copy Direct URL</span>
                    </button>
                    <button
                      onClick={() => handleCopyLink('proxy')}
                      className="flex-1 py-2 px-3 rounded-xl bg-surface-elevated border border-white/10 text-gray-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition"
                    >
                      {copiedType === 'proxy' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                      <span>Copy Proxied URL</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieboxDetail;
