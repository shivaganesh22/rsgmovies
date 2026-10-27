import React, { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Film,
  Star,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Globe,
  Tv,
  Download,
  Check,
} from 'lucide-react';
import blastApi from '../../api/blast';
import VideoPlayer from '../../components/media/VideoPlayer';
import TrailerModal from '../../components/media/TrailerModal';
import CastModal from '../../components/media/CastModal';
import MediaCarousel from '../../components/media/MediaCarousel';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import { getWatchItem } from '../../utils/watchHistory';
import { getMediaProxyUrl, getStreamDownloadFilename } from '../../utils/media';

export const SeriesDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialTime = parseFloat(searchParams.get('time') || 0);
  const targetSeason = parseInt(searchParams.get('season') || '0', 10);
  const targetEpisode = parseInt(searchParams.get('episode') || '0', 10);
  const shouldAutoPlay = searchParams.get('play') === 'true' || initialTime > 0;

  const playerRef = useRef(null);
  const castScrollRef = useRef(null);

  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState(0);
  const [activeEpisode, setActiveEpisode] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [selectedCastMember, setSelectedCastMember] = useState(null);

  // Fetch Series Details
  const { data: series, isLoading, isError, refetch } = useQuery({
    queryKey: ['blastSeriesDetails', id],
    queryFn: () => blastApi.getSeriesDetails(id),
    enabled: Boolean(id),
  });

  // Fetch Related Series
  const { data: relatedData } = useQuery({
    queryKey: ['blastSeriesRelated', id],
    queryFn: () => blastApi.getSeriesRelated(id),
    enabled: Boolean(id),
  });

  const seasons = Array.isArray(series?.seasons) ? series.seasons : [];
  const currentSeason = seasons[selectedSeasonIndex] || seasons[0];
  const episodes = Array.isArray(currentSeason?.episodes) ? currentSeason.episodes : [];
  const relatedSeries = relatedData?.relateds || relatedData?.series || (Array.isArray(relatedData) ? relatedData : []);

  const savedWatchItem = getWatchItem(id, targetSeason || currentSeason?.season_number, targetEpisode || activeEpisode?.episode_number) || getWatchItem(id);
  const effectiveInitialTime = initialTime > 0 ? initialTime : (savedWatchItem?.currentTime > 5 ? savedWatchItem.currentTime : 0);

  // Auto-select season / episode & matching stream if URL parameters present or history exists
  useEffect(() => {
    if (shouldAutoPlay && seasons.length > 0) {
      let seasonIdx = 0;
      const desiredSeason = targetSeason > 0 ? targetSeason : (savedWatchItem?.season_number || 0);
      if (desiredSeason > 0) {
        const foundIdx = seasons.findIndex((s) => s.season_number === desiredSeason);
        if (foundIdx !== -1) seasonIdx = foundIdx;
      }
      setSelectedSeasonIndex(seasonIdx);

      const targetEpisodes = seasons[seasonIdx]?.episodes || [];
      let epToPlay = targetEpisodes[0];
      const desiredEpisode = targetEpisode > 0 ? targetEpisode : (savedWatchItem?.episode_number || 0);
      if (desiredEpisode > 0) {
        const foundEp = targetEpisodes.find((ep) => ep.episode_number === desiredEpisode);
        if (foundEp) epToPlay = foundEp;
      }

      if (epToPlay) {
        const targetVideoId = searchParams.get('videoId') || savedWatchItem?.videoId;
        const targetServer = searchParams.get('server') || savedWatchItem?.server;
        const epVideos = Array.isArray(epToPlay.videos) ? epToPlay.videos : [];
        let specificVideo = epVideos[0];
        if (targetVideoId || targetServer) {
          const foundVid = epVideos.find(
            (v) =>
              (targetVideoId && String(v.id) === String(targetVideoId)) ||
              (targetServer && (String(v.server) === String(targetServer) || String(v.video_name) === String(targetServer)))
          );
          if (foundVid) specificVideo = foundVid;
        }
        handlePlayEpisode(epToPlay, specificVideo);
      }
    }
  }, [shouldAutoPlay, seasons.length, targetSeason, targetEpisode]);

  const handlePlayEpisode = (ep, specificVideo) => {
    setActiveEpisode(ep);
    const vids = Array.isArray(ep.videos) ? ep.videos : [];
    if (specificVideo) {
      setSelectedVideo(specificVideo);
    } else if (vids.length > 0) {
      setSelectedVideo(vids[0]);
    } else {
      setSelectedVideo(null);
    }
    setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleScrollCast = (direction) => {
    if (castScrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      castScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError || !series || series.status === 404) {
    return <ErrorState onRetry={refetch} message="Series details could not be found." />;
  }

  const casters = Array.isArray(series.casterslist) ? series.casterslist : [];
  const genres = Array.isArray(series.genreslist)
    ? series.genreslist
    : Array.isArray(series.genres)
    ? series.genres
    : series.genre
    ? [series.genre]
    : [];
  const displayYear = (series.release_date || series.first_air_date || series.year || series.created_at || '').substring(0, 4);
  const ratingNum = Number(series.vote_average || 0);
  const languages = Array.isArray(series.spoken_languages) ? series.spoken_languages : [];

  const episodeVideos = Array.isArray(activeEpisode?.videos) ? activeEpisode.videos : [];
  const selectedStreamLabel = selectedVideo
    ? `${selectedVideo.server || selectedVideo.video_name || 'Server 1'}${selectedVideo.lang ? ` (${selectedVideo.lang})` : ''}`
    : '1080P (Default)';

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Video Player Section */}
      {activeEpisode && selectedVideo && (
        <div ref={playerRef} className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white">
              Playing S{currentSeason?.season_number || 1} E{activeEpisode.episode_number}: {activeEpisode.name || 'Untitled'} (
              {selectedStreamLabel})
            </h3>
            <div className="flex items-center gap-2">
              {selectedVideo.link && (
                <a
                  href={getMediaProxyUrl(selectedVideo.link, {
                    download: true,
                    filename: getStreamDownloadFilename(
                      `${series.name} - S${currentSeason?.season_number || 1} E${activeEpisode.episode_number}`,
                      selectedVideo,
                      selectedVideo.link
                    ),
                    stream: selectedVideo,
                  })}
                  download
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
                >
                  <Download size={14} />
                  <span>Download Episode</span>
                </a>
              )}
              <Button variant="ghost" size="sm" onClick={() => setActiveEpisode(null)}>
                Close Player
              </Button>
            </div>
          </div>

          <VideoPlayer
            src={selectedVideo.link}
            poster={activeEpisode.still_path || activeEpisode.still_path_tv || series.backdrop_path || series.poster_path}
            title={`${series.name} - S${currentSeason?.season_number || 1} E${activeEpisode.episode_number}: ${activeEpisode.name || ''}`}
            qualities={episodeVideos}
            currentQuality={selectedVideo}
            onQualityChange={setSelectedVideo}
            languages={languages}
            mediaId={series.id}
            mediaType="series"
            seasonNumber={currentSeason?.season_number || 1}
            episodeNumber={activeEpisode.episode_number}
            episodeName={activeEpisode.name}
            genresname={series.genresname}
            genre={series.genresname || (series.genres && series.genres[0]?.name) || ''}
            rating={series.vote_average}
            year={series.first_air_date ? String(series.first_air_date).substring(0, 4) : ''}
            initialTime={effectiveInitialTime}
          />
        </div>
      )}

      {/* Series Details Main Card */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl p-6 sm:p-8 md:p-10 bg-surface">
        {/* Backdrop with Blur */}
        {(series.backdrop_path || series.backdrop_path_tv || series.poster_path) && (
          <div
            className="absolute inset-0 bg-cover bg-center filter brightness-[0.22] blur-[3px] pointer-events-none scale-105"
            style={{
              backgroundImage: `url(${
                series.backdrop_path || series.backdrop_path_tv || series.poster_path
              })`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-darkbg via-darkbg/80 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-darkbg via-darkbg/85 to-transparent hidden md:block pointer-events-none" />

        {/* Layout: Desktop (Poster Left, Details Right) | Mobile (Poster Centered, Details Below) */}
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
          {/* Poster Column */}
          <div className="relative w-44 sm:w-52 md:w-64 lg:w-72 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-surface flex-shrink-0 mx-auto md:mx-0 hover:scale-105 transition-transform duration-300">
            <img
              src={series.poster_path || series.backdrop_path}
              alt={series.name}
              className="w-full h-full object-cover"
            />
            {/* Badges on Poster Card Top Edges */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
              {(series.quality || series.subtitle) ? (
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-lg bg-blue-600 text-white shadow-md">
                  {series.quality || series.subtitle}
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-lg bg-blue-600 text-white shadow-md">
                  HD
                </span>
              )}
              {ratingNum > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-lg bg-black/80 text-amber-400 backdrop-blur-sm border border-amber-400/20 shadow-md">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  {ratingNum.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-3.5 w-full">
            {/* 1. Title moved above metadata */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-tight drop-shadow-md">
              {series.name}
            </h1>

            {/* Tagline */}
            {series.tagline && (
              <p className="text-xs sm:text-sm text-blue-300/90 italic font-medium">
                "{series.tagline}"
              </p>
            )}

            {/* 2. Metadata Row: Year, Seasons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-gray-300 font-medium">
              {displayYear && (
                <span className="px-2 py-0.5 rounded-lg bg-surface-elevated text-gray-300 border border-white/5">
                  {displayYear}
                </span>
              )}

              {seasons.length > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-surface-elevated text-gray-300 border border-white/5">
                  {seasons.length} {seasons.length === 1 ? 'Season' : 'Seasons'}
                </span>
              )}
            </div>

            {/* 3. Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                {genres.map((g, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl text-xs font-medium bg-surface-elevated text-gray-300 border border-white/10"
                  >
                    {typeof g === 'object' ? g.name || g.title : g}
                  </span>
                ))}
              </div>
            )}

            {/* 4. Action Buttons (2-per-row on mobile, 1-line on desktop, single-line text) */}
            <div className="grid grid-cols-2 md:flex md:flex-row md:flex-nowrap md:items-center md:justify-start gap-2.5 pt-2 w-full md:w-auto">
              {episodes.length > 0 && (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full md:w-auto justify-center text-xs font-bold whitespace-nowrap shadow-lg shadow-blue-600/30 px-3 py-2.5"
                  onClick={() => handlePlayEpisode(episodes[0])}
                  icon={<Play size={15} className="fill-current flex-shrink-0" />}
                >
                  <span className="whitespace-nowrap truncate">Play S{currentSeason?.season_number || 1} E1</span>
                </Button>
              )}

              {(series.preview_path || series.trailer_url) && (
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full md:w-auto justify-center text-xs font-semibold whitespace-nowrap px-3 py-2.5"
                  onClick={() => setIsTrailerOpen(true)}
                  icon={<Film size={15} className="flex-shrink-0" />}
                >
                  <span className="whitespace-nowrap truncate">Trailer</span>
                </Button>
              )}
            </div>

            {/* 5. Synopsis Section with Languages placed start-left below synopsis */}
            <div className="text-left w-full pt-4 border-t border-white/10 space-y-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1.5">Synopsis</h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-normal">
                  {series.overview || 'No synopsis available for this series.'}
                </p>
              </div>

              {/* Languages line: start-left below synopsis */}
              {languages.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1 text-left justify-start">
                  <Globe size={13} className="text-gray-500 flex-shrink-0" />
                  <span>Languages: </span>
                  <strong className="text-gray-300 font-semibold">
                    {languages.map((l) => (typeof l === 'object' ? l.english_name || l.name : l)).join(', ')}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Season Selector Tabs & Episodes List */}
      {seasons.length > 0 ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/10 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-blue-400" />
              <span>Episodes & Seasons</span>
            </h3>

            {/* Season Selector Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {seasons.map((season, idx) => (
                <button
                  key={season.id || idx}
                  onClick={() => setSelectedSeasonIndex(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                    selectedSeasonIndex === idx
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                      : 'bg-surface-elevated text-gray-400 hover:text-white border border-white/5'
                  }`}
                >
                  {season.name || `Season ${season.season_number || idx + 1}`}
                </button>
              ))}
            </div>
          </div>

          {/* Episodes Grid: 2 per row on mobile, 3 on tablet, 4 on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {episodes.map((ep) => {
              const isCurrentPlaying = activeEpisode?.id === ep.id;
              const epBadge = `S${currentSeason?.season_number || 1}E${ep.episode_number || 1}`;

              // Prioritize still_path with https
              let epStill = ep.still_path || ep.still_path_tv || series.backdrop_path;
              if (epStill && typeof epStill === 'string' && epStill.startsWith('http://')) {
                epStill = epStill.replace('http://', 'https://');
              }

              return (
                <div
                  key={ep.id}
                  onClick={() => handlePlayEpisode(ep)}
                  className={`group relative rounded-xl overflow-hidden border p-1 sm:p-1.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md ${
                    isCurrentPlaying
                      ? 'border-blue-500 bg-blue-600/10 ring-1 ring-blue-500/40'
                      : 'border-white/5 bg-surface hover:border-blue-500/40'
                  }`}
                >
                  {/* Episode Still (16:9 Aspect Ratio) */}
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-surface-elevated">
                    {epStill ? (
                      <img
                        src={epStill}
                        alt={ep.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 bg-surface-elevated">
                        <Tv size={22} />
                      </div>
                    )}

                    {/* S1E61 Badge */}
                    <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5">
                      <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-black/85 text-white border border-white/15 shadow-sm">
                        {epBadge}
                      </span>
                    </div>

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/50">
                        <Play size={13} className="fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Compact Episode Info with Description */}
                  <div className="pt-1.5 px-0.5">
                    <h4 className="text-[11px] sm:text-xs font-semibold text-white group-hover:text-blue-400 transition truncate">
                      {ep.episode_number ? `Ep ${ep.episode_number}: ` : ''}
                      {ep.name || 'Untitled'}
                    </h4>
                    {ep.overview ? (
                      <p className="text-[10px] sm:text-[11px] text-gray-400 line-clamp-2 mt-0.5 sm:mt-1 leading-snug font-normal">
                        {ep.overview}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Cast & Crew Section */}
      {casters.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Cast & Crew</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleScrollCast('left')}
                className="p-1.5 rounded-lg bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white transition border border-white/5"
                aria-label="Scroll cast left"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => handleScrollCast('right')}
                className="p-1.5 rounded-lg bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white transition border border-white/5"
                aria-label="Scroll cast right"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div
            ref={castScrollRef}
            className="flex gap-4 overflow-x-auto no-scrollbar pb-3 pt-1 scroll-smooth"
          >
            {casters.map((c, i) => (
              <div
                key={c.id || i}
                onClick={() => setSelectedCastMember(c)}
                className="flex-shrink-0 w-24 sm:w-28 text-center group cursor-pointer"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl overflow-hidden shadow-lg border border-white/10 bg-surface group-hover:border-blue-500/50 group-hover:scale-105 transition-all">
                  {c.profile_path ? (
                    <img
                      src={c.profile_path}
                      alt={c.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface-elevated text-gray-500 font-bold text-lg">
                      {c.name ? c.name.charAt(0) : '?'}
                    </div>
                  )}
                </div>
                <h4 className="text-xs font-semibold text-white mt-2 group-hover:text-blue-400 transition truncate">
                  {c.name}
                </h4>
                <p className="text-[10px] text-gray-400 truncate">{c.character || 'Cast'}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Series Section */}
      {relatedSeries.length > 0 && (
        <MediaCarousel
          title="Related Series"
          items={relatedSeries}
          type="series"
        />
      )}

      {/* Trailer Modal */}
      {isTrailerOpen && (
        <TrailerModal
          isOpen={isTrailerOpen}
          onClose={() => setIsTrailerOpen(false)}
          title={series.name}
          previewPath={series.preview_path}
          trailerUrl={series.trailer_url}
        />
      )}

      {/* Cast Filmography Modal */}
      {selectedCastMember && (
        <CastModal
          isOpen={Boolean(selectedCastMember)}
          onClose={() => setSelectedCastMember(null)}
          castMember={selectedCastMember}
        />
      )}
    </div>
  );
};

export default SeriesDetails;
