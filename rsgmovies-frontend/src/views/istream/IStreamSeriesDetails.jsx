import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Film,
  Star,
  ChevronLeft,
  ChevronRight,
  Tv,
  Layers,
  Calendar,
  Sparkles,
  Check,
  Server,
  X,
} from 'lucide-react';
import istreamApi from '../../api/istream';
import IStreamPlayer from '../../components/media/IStreamPlayer';
import TrailerModal from '../../components/media/TrailerModal';
import MediaCarousel from '../../components/media/MediaCarousel';
import Button from '../../components/ui/Button';
import { DetailSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { formatRuntime } from '../../utils/media';

export const IStreamSeriesDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const playerRef = useRef(null);
  const seasonsScrollRef = useRef(null);

  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);

  const QUERY_OPTIONS = {
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
  };

  // Fetch Series Details
  const { data: series, isLoading: seriesLoading, isError, refetch } = useQuery({
    queryKey: ['istreamSeries', id],
    queryFn: () => istreamApi.getSeriesDetails(id),
    ...QUERY_OPTIONS,
  });

  // Fetch Seasons
  const { data: seasons } = useQuery({
    queryKey: ['istreamSeriesSeasons', id],
    queryFn: () => istreamApi.getSeriesSeasons(id),
    ...QUERY_OPTIONS,
  });

  const seasonsList = Array.isArray(seasons) ? seasons : [];

  // Auto-select first season when seasons data loads
  useEffect(() => {
    if (seasonsList.length > 0 && !selectedSeason) {
      setSelectedSeason(seasonsList[0]);
    }
  }, [seasonsList, selectedSeason]);

  const activeSeasonId = selectedSeason ? selectedSeason.id : '';

  // Fetch Episodes for active season
  const { data: episodes, isLoading: episodesLoading } = useQuery({
    queryKey: ['istreamSeriesEpisodes', activeSeasonId],
    queryFn: () => istreamApi.getSeriesEpisodes(activeSeasonId),
    enabled: Boolean(activeSeasonId),
    ...QUERY_OPTIONS,
  });

  const episodesList = Array.isArray(episodes) ? episodes : [];

  // Auto-select first episode when episodes load
  useEffect(() => {
    if (episodesList.length > 0 && !selectedEpisode) {
      setSelectedEpisode(episodesList[0]);
    }
  }, [episodesList, selectedEpisode]);

  // Fetch Related Series
  const { data: relatedSeries } = useQuery({
    queryKey: ['istreamRelatedSeries', id],
    queryFn: () => istreamApi.getRelatedSeries(id),
    ...QUERY_OPTIONS,
  });

  const relatedList = Array.isArray(relatedSeries) ? relatedSeries : [];

  const extractVideoId = (url) => {
    if (!url) return '';
    try {
      if (url.includes('id=')) {
        return url.split('id=')[1].split('&')[0];
      }
      const match = url.match(/\/(\d+)/);
      return match ? match[1] : '';
    } catch (e) {
      return '';
    }
  };

  const handleWatchSeriesClick = () => {
    if (episodesList.length > 0) {
      setIsStreamModalOpen(true);
    } else {
      setIsPlayerOpen(true);
    }
  };

  const handlePlayEpisode = (ep) => {
    if (ep) {
      setSelectedEpisode(ep);
    } else if (episodesList.length > 0 && !selectedEpisode) {
      setSelectedEpisode(episodesList[0]);
    }
    setIsStreamModalOpen(false);
    setIsPlayerOpen(true);
    setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleScrollSeasons = (direction) => {
    if (seasonsScrollRef.current) {
      const amount = direction === 'left' ? -300 : 300;
      seasonsScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  if (seriesLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !series) {
    return <ErrorState onRetry={refetch} message="Could not load web series details." />;
  }

  const title = series.name || series.title || series.title_name || 'Web Series';
  const poster = series.poster || series.poster_path || series.miniposter;
  const backdrop = series.banner || series.backdrop_path || poster;
  const customTag = series.custom_tag?.custom_tags_name || series.custom_tags_name || series.quality || 'HD';
  const ratingNum = Number(series.rate || series.vote_average || 0);
  const releaseYear = (series.release_date || series.year || '').substring(0, 4);

  const manifestUrl = selectedEpisode?.url ? istreamApi.getManifestUrl(selectedEpisode.url) : '';
  const trailerSource = series.youtube_trailer || series.trailer_url || series.trailer || series.preview_path;

  const genres = Array.isArray(series.genreslist)
    ? series.genreslist
    : typeof series.genres === 'string'
    ? series.genres.split(',').map((g) => g.trim())
    : [];

  return (
    <div className="space-y-8 animate-fade-in pb-16 text-left">
      {/* Stream / Episode Selector Dialog */}
      {isStreamModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-darkbg border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-purple-400" />
                <h3 className="text-base font-bold text-white">Select Episode to Play</h3>
              </div>
              <button
                onClick={() => setIsStreamModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar pt-1">
              {episodesList.map((ep) => {
                const isSelected = selectedEpisode?.id === ep.id;
                return (
                  <button
                    key={ep.id}
                    onClick={() => handlePlayEpisode(ep)}
                    className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-purple-600/30 border-purple-500 text-white font-bold'
                        : 'bg-surface-elevated border-white/10 text-gray-200 hover:border-purple-500/50 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                        {ep.episoade_order || 1}
                      </div>
                      <div className="truncate">
                        <span className="font-semibold text-xs text-white block truncate">
                          {ep.Episoade_Name}
                        </span>
                        {ep.episoade_description && (
                          <span className="text-[10px] text-gray-400 truncate block max-w-[200px]">
                            {ep.episoade_description}
                          </span>
                        )}
                      </div>
                    </div>
                    <Play size={14} className="text-purple-400 fill-current flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition"
      >
        <ChevronLeft size={16} />
        <span>Back</span>
      </button>

      {/* Video Player Section (Only Activated on User Click) */}
      {isPlayerOpen && selectedEpisode && manifestUrl && (
        <div ref={playerRef} className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white">
              Playing: {title} - {selectedEpisode.Episoade_Name || `Episode ${selectedEpisode.episoade_order}`}
            </h3>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsPlayerOpen(false)}>
                Close Player
              </Button>
            </div>
          </div>

          <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <IStreamPlayer
              src={manifestUrl}
              poster={selectedEpisode.episoade_image || backdrop}
              title={`${title} - ${selectedEpisode.Episoade_Name || `Episode ${selectedEpisode.episoade_order}`}`}
              mediaId={`istream_series_${id}`}
              mediaType="series"
              seasonNumber={selectedSeason?.season_order || 1}
              episodeNumber={selectedEpisode.episoade_order || 1}
              episodeName={selectedEpisode.Episoade_Name}
              year={releaseYear}
            />
          </div>
        </div>
      )}

      {/* Main Series Details Card (Blast Format with Blur Backdrop) */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl p-6 sm:p-8 md:p-10 bg-surface">
        {/* Background Backdrop Image with Blur */}
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
          <div className="relative w-44 sm:w-52 md:w-64 lg:w-72 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-surface flex-shrink-0 mx-auto md:mx-0 hover:scale-105 transition-transform duration-300">
            <img src={poster} alt={title} className="w-full h-full object-cover" />
            
            {/* Top Badges on Poster */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
              <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-lg bg-purple-600 text-white shadow-md">
                {customTag}
              </span>
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
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-tight drop-shadow-md">
              {title}
            </h1>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-gray-300 font-medium">
              {releaseYear && (
                <span className="px-2.5 py-1 rounded-lg bg-surface-elevated text-gray-300 border border-white/5 flex items-center gap-1">
                  <Calendar size={12} />
                  {releaseYear}
                </span>
              )}
              {series.runtime && (
                <span className="px-2.5 py-1 rounded-lg bg-surface-elevated text-gray-300 border border-white/5 flex items-center gap-1">
                  <Clock size={12} />
                  {formatRuntime(series.runtime)}
                </span>
              )}
              {seasonsList.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-surface-elevated text-gray-300 border border-white/5 flex items-center gap-1">
                  <Layers size={12} />
                  {seasonsList.length} Season{seasonsList.length > 1 ? 's' : ''}
                </span>
              )}
              {customTag && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center gap-1 font-bold">
                  <Sparkles size={12} />
                  {customTag}
                </span>
              )}
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

            {/* Actions Bar */}
            <div className="grid grid-cols-2 md:flex md:flex-row md:flex-nowrap md:items-center md:justify-start gap-2.5 pt-2 w-full md:w-auto">
              {/* Primary Play Episode / Watch Series Button */}
              <Button
                variant="primary"
                size="md"
                className="w-full md:w-auto justify-center text-xs font-bold whitespace-nowrap shadow-lg shadow-purple-600/30 px-3 py-2.5 bg-purple-600 hover:bg-purple-500"
                onClick={handleWatchSeriesClick}
                icon={<Play size={15} className="fill-current flex-shrink-0" />}
              >
                <span className="whitespace-nowrap truncate">
                  {selectedEpisode ? `Play E${selectedEpisode.episoade_order || 1}` : 'Watch Series'}
                </span>
              </Button>

              {/* Trailer Button */}
              {trailerSource && (
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

            {/* Synopsis Section */}
            {series.description && (
              <div className="text-left w-full pt-4 border-t border-white/10 space-y-2">
                <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Storyline</h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  {series.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Season Tabs & Episode List */}
      {seasonsList.length > 0 && (
        <div className="space-y-4">
          {/* Season Header & Selector */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-purple-400" />
              <span>Seasons & Episodes</span>
            </h3>
            {seasonsList.length > 4 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleScrollSeasons('left')}
                  className="p-1 rounded-lg bg-surface-elevated text-gray-300 hover:text-white border border-white/5"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => handleScrollSeasons('right')}
                  className="p-1 rounded-lg bg-surface-elevated text-gray-300 hover:text-white border border-white/5"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          <div
            ref={seasonsScrollRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth"
          >
            {seasonsList.map((sn) => {
              const snId = sn.id;
              const isActive = selectedSeason?.id === snId;
              const seasonTitle = sn.Session_Name || sn.season_name || `Season ${sn.season_order || 1}`;
              return (
                <button
                  key={snId}
                  onClick={() => {
                    setSelectedSeason(sn);
                    setSelectedEpisode(null);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition flex-shrink-0 ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-surface-elevated text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  <Layers size={14} />
                  <span>{seasonTitle}</span>
                </button>
              );
            })}
          </div>

          {/* Episode List Grid */}
          {episodesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-24 rounded-2xl bg-surface-elevated animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {episodesList.map((ep) => {
                const isEpActive = selectedEpisode?.id === ep.id;
                return (
                  <div
                    key={ep.id}
                    onClick={() => handlePlayEpisode(ep)}
                    className={`relative rounded-2xl overflow-hidden bg-surface-card border p-3 flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.02] ${
                      isEpActive
                        ? 'border-purple-500 ring-2 ring-purple-500/50 bg-purple-950/30'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="relative w-28 h-16 rounded-xl overflow-hidden bg-black flex-shrink-0">
                      <img
                        src={ep.episoade_image || poster}
                        alt={ep.Episoade_Name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play size={18} className={isEpActive ? 'fill-purple-400 text-purple-400' : 'text-white'} />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                        Episode {ep.episoade_order || ''}
                      </span>
                      <h4 className="text-xs font-bold text-white truncate">{ep.Episoade_Name}</h4>
                      {ep.episoade_description && (
                        <p className="text-[10px] text-gray-400 line-clamp-2 mt-0.5">
                          {ep.episoade_description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Trailer Modal */}
      {trailerSource && (
        <TrailerModal
          isOpen={isTrailerOpen}
          onClose={() => setIsTrailerOpen(false)}
          previewPath={series.preview_path || trailerSource}
          trailerUrl={trailerSource}
          title={title}
        />
      )}

      {/* Related Web Series */}
      {relatedList.length > 0 && (
        <MediaCarousel
          title="Related Web Series"
          items={relatedList.map((i) => ({
            ...i,
            targetLink: `/istream/series/${i.id}`,
            badge: i.custom_tag?.custom_tags_name || i.custom_tags_name || i.quality || i.badge,
          }))}
          type="series"
        />
      )}
    </div>
  );
};

export default IStreamSeriesDetails;
