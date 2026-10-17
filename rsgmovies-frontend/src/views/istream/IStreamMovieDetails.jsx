import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Film,
  Star,
  ChevronLeft,
  ChevronDown,
  Check,
  Sparkles,
  Calendar,
  Clock,
  Loader2,
  X,
  Server,
} from 'lucide-react';
import istreamApi from '../../api/istream';
import IStreamPlayer from '../../components/media/IStreamPlayer';
import TrailerModal from '../../components/media/TrailerModal';
import MediaCarousel from '../../components/media/MediaCarousel';
import Button from '../../components/ui/Button';
import { DetailSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import { formatRuntime } from '../../utils/media';

export const IStreamMovieDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const playerRef = useRef(null);
  const streamDropdownRef = useRef(null);

  const [selectedLink, setSelectedLink] = useState(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isStreamMenuOpen, setIsStreamMenuOpen] = useState(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);

  const QUERY_OPTIONS = {
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
  };

  // Fetch Movie Details
  const { data: movie, isLoading: movieLoading, isError, refetch } = useQuery({
    queryKey: ['istreamMovie', id],
    queryFn: () => istreamApi.getMovieDetails(id),
    ...QUERY_OPTIONS,
  });

  // Fetch Play Links (Only triggered when user clicks Watch Now)
  const {
    data: playLinks,
    isLoading: isLinksLoading,
    isFetching: isLinksFetching,
    refetch: fetchPlayLinks,
  } = useQuery({
    queryKey: ['istreamMovieLinks', id],
    queryFn: () => istreamApi.getMoviePlayLinks(id),
    enabled: false, // DO NOT auto-fetch on mount!
    ...QUERY_OPTIONS,
  });

  // Fetch Related Movies (Independent)
  const { data: relatedMovies } = useQuery({
    queryKey: ['istreamRelatedMovies', id],
    queryFn: () => istreamApi.getRelatedMovies(id),
    ...QUERY_OPTIONS,
  });

  const linksList = Array.isArray(playLinks) ? playLinks : [];
  const relatedList = Array.isArray(relatedMovies) ? relatedMovies : [];

  // Auto-select first stream server when links load if none is selected
  useEffect(() => {
    if (linksList.length > 0 && !selectedLink) {
      setSelectedLink(linksList[0]);
    }
  }, [linksList, selectedLink]);

  // Close stream dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (streamDropdownRef.current && !streamDropdownRef.current.contains(e.target)) {
        setIsStreamMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleWatchNowClick = () => {
    setIsStreamModalOpen(true);
    if (!playLinks) {
      fetchPlayLinks();
    }
  };

  const handleSelectStream = (link) => {
    setSelectedLink(link);
    setIsStreamModalOpen(false);
    setIsPlayerOpen(true);
    setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  if (movieLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !movie) {
    return <ErrorState onRetry={refetch} message="Could not load movie details." />;
  }

  const title = movie.name || movie.title || movie.title_name || 'Movie';
  const poster = movie.poster || movie.poster_path || movie.miniposter;
  const backdrop = movie.banner || movie.backdrop_path || poster;
  const customTag = movie.custom_tag?.custom_tags_name || movie.custom_tags_name || movie.quality || 'HD';
  const ratingNum = Number(movie.rate || movie.vote_average || 0);
  const releaseYear = (movie.release_date || movie.year || '').substring(0, 4);

  const manifestUrl = selectedLink?.url ? istreamApi.getManifestUrl(selectedLink.url) : '';
  const trailerSource = movie.youtube_trailer || movie.trailer_url || movie.trailer || movie.preview_path;

  const selectedStreamLabel = selectedLink
    ? `${selectedLink.name || `Link ${selectedLink.link_order || 1}`}${selectedLink.quality ? ` (${selectedLink.quality})` : ''}`
    : 'Select Stream';

  const genres = Array.isArray(movie.genreslist)
    ? movie.genreslist
    : typeof movie.genres === 'string'
    ? movie.genres.split(',').map((g) => g.trim())
    : [];

  return (
    <div className="space-y-8 animate-fade-in pb-16 text-left">
      {/* Stream Selection Dialog / Modal */}
      {isStreamModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-darkbg border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-blue-400" />
                <h3 className="text-base font-bold text-white">Select Stream Server</h3>
              </div>
              <button
                onClick={() => setIsStreamModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {isLinksLoading || isLinksFetching ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-3">
                <Loader2 size={32} className="text-blue-500 animate-spin" />
                <p className="text-xs text-gray-300 font-medium">Fetching high-speed stream servers...</p>
              </div>
            ) : linksList.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-gray-300">No active stream servers found for this movie.</p>
                <Button variant="secondary" size="sm" onClick={() => fetchPlayLinks()}>
                  Retry Fetching Streams
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pt-1">
                {linksList.map((link, i) => {
                  const isSelected = selectedLink?.id === link.id;
                  return (
                    <button
                      key={link.id || i}
                      onClick={() => handleSelectStream(link)}
                      className={`w-full text-left p-3 rounded-2xl border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-600/30 border-blue-500 text-white font-bold'
                          : 'bg-surface-elevated border-white/10 text-gray-200 hover:border-blue-500/50 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                          {i + 1}
                        </div>
                        <div>
                          <span className="font-semibold text-xs text-white block">
                            {link.name || `Server ${i + 1}`}
                          </span>
                          {link.quality && (
                            <span className="text-[10px] text-gray-400 block">{link.quality}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Play size={14} className="text-blue-400 fill-current" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
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
      {isPlayerOpen && selectedLink && manifestUrl && (
        <div ref={playerRef} className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white">
              Now Playing: {title} ({selectedStreamLabel})
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
              poster={backdrop}
              title={title}
              mediaId={`istream_${id}`}
              mediaType="movie"
              year={releaseYear}
              qualities={linksList}
              currentQuality={selectedLink}
              onQualityChange={(link) => setSelectedLink(link)}
            />
          </div>
        </div>
      )}

      {/* Main Movie Details Card (Blast Format with Blur Backdrop) */}
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
              <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-lg bg-blue-600 text-white shadow-md">
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
              {movie.runtime && (
                <span className="px-2.5 py-1 rounded-lg bg-surface-elevated text-gray-300 border border-white/5 flex items-center gap-1">
                  <Clock size={12} />
                  {formatRuntime(movie.runtime)}
                </span>
              )}
              {customTag && (
                <span className="px-2.5 py-1 rounded-lg bg-red-600/30 text-red-300 border border-red-500/30 flex items-center gap-1 font-bold">
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
              {/* Primary Watch Movie Button */}
              <Button
                variant="primary"
                size="md"
                className="w-full md:w-auto justify-center text-xs font-bold whitespace-nowrap shadow-lg shadow-blue-600/30 px-3 py-2.5"
                onClick={handleWatchNowClick}
                icon={<Play size={15} className="fill-current flex-shrink-0" />}
              >
                <span className="whitespace-nowrap truncate">Watch Movie</span>
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
            {movie.description && (
              <div className="text-left w-full pt-4 border-t border-white/10 space-y-2">
                <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Storyline</h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                  {movie.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      {trailerSource && (
        <TrailerModal
          isOpen={isTrailerOpen}
          onClose={() => setIsTrailerOpen(false)}
          previewPath={movie.preview_path || trailerSource}
          trailerUrl={trailerSource}
          title={title}
        />
      )}

      {/* Related Movies */}
      {relatedList.length > 0 && (
        <MediaCarousel
          title="Related Movies"
          items={relatedList.map((i) => ({
            ...i,
            targetLink: `/istream/movie/${i.id}`,
            badge: i.custom_tag?.custom_tags_name || i.custom_tags_name || i.quality || i.badge,
          }))}
        />
      )}
    </div>
  );
};

export default IStreamMovieDetails;
