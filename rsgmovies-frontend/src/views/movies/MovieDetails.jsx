import React, { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Film,
  Star,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Globe,
  Building,
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

export const MovieDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialTime = parseFloat(searchParams.get('time') || 0);
  const shouldAutoPlay = searchParams.get('play') === 'true' || initialTime > 0;

  const playerRef = useRef(null);
  const castScrollRef = useRef(null);
  const streamDropdownRef = useRef(null);

  const [selectedVideoState, setSelectedVideoState] = useState(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [selectedCastMember, setSelectedCastMember] = useState(null);
  const [isStreamMenuOpen, setIsStreamMenuOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (streamDropdownRef.current && !streamDropdownRef.current.contains(e.target)) {
        setIsStreamMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Movie Details
  const { data: movie, isLoading, isError, refetch } = useQuery({
    queryKey: ['blastMovieDetails', id],
    queryFn: () => blastApi.getMovieDetails(id),
    enabled: Boolean(id),
  });

  // Fetch Related Movies
  const { data: relatedData } = useQuery({
    queryKey: ['blastMovieRelated', id],
    queryFn: () => blastApi.getMovieRelated(id),
    enabled: Boolean(id),
  });

  const videos = Array.isArray(movie?.videos) ? movie.videos : [];
  const selectedVideo = selectedVideoState || (videos.length > 0 ? videos[0] : null);
  const relatedMovies = relatedData?.relateds || relatedData?.movies || (Array.isArray(relatedData) ? relatedData : []);

  // Saved watch item from local history
  const savedWatchItem = getWatchItem(id);
  const effectiveInitialTime = initialTime > 0 ? initialTime : (savedWatchItem?.currentTime > 5 ? savedWatchItem.currentTime : 0);

  // Auto-open player if navigated with time / play param & restore matching stream
  useEffect(() => {
    if (shouldAutoPlay && videos.length > 0) {
      const targetVideoId = searchParams.get('videoId') || savedWatchItem?.videoId;
      const targetServer = searchParams.get('server') || savedWatchItem?.server;
      let videoToSelect = videos[0];

      if (targetVideoId || targetServer) {
        const found = videos.find(
          (v) =>
            (targetVideoId && String(v.id) === String(targetVideoId)) ||
            (targetServer && (String(v.server) === String(targetServer) || String(v.video_name) === String(targetServer)))
        );
        if (found) videoToSelect = found;
      }

      setSelectedVideoState(videoToSelect);
      setIsPlayerOpen(true);
      setTimeout(() => {
        playerRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    }
  }, [shouldAutoPlay, videos.length]);

  const handleStartPlay = (videoToPlay) => {
    if (videoToPlay) {
      setSelectedVideoState(videoToPlay);
    } else if (videos.length > 0 && !selectedVideoState) {
      setSelectedVideoState(videos[0]);
    }
    setIsPlayerOpen(true);
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

  if (isError || !movie || movie.status === 404) {
    return <ErrorState onRetry={refetch} message="Movie details could not be found." />;
  }

  const casters = Array.isArray(movie.casterslist) ? movie.casterslist : [];
  const genres = Array.isArray(movie.genreslist)
    ? movie.genreslist
    : Array.isArray(movie.genres)
    ? movie.genres
    : movie.genre
    ? [movie.genre]
    : [];
  const languages = Array.isArray(movie.spoken_languages) ? movie.spoken_languages : [];
  const productionCompanies = Array.isArray(movie.production_companies) ? movie.production_companies : [];
  const displayYear = (movie.release_date || movie.year || movie.created_at || '').substring(0, 4);

  const formatRuntime = (mins) => {
    if (!mins) return null;
    const num = parseInt(mins, 10);
    if (isNaN(num)) return `${mins} min`;
    const h = Math.floor(num / 60);
    const m = num % 60;
    return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}` : `${m}m`;
  };

  const selectedStreamLabel = selectedVideo
    ? `${selectedVideo.server || selectedVideo.video_name || 'Server 1'}${selectedVideo.lang ? ` (${selectedVideo.lang})` : ''}`
    : '1080P (Default)';

  const ratingNum = Number(movie.vote_average || 0);

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Video Player Section (When Activated) */}
      {isPlayerOpen && selectedVideo && (
        <div ref={playerRef} className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white">
              Now Playing: {movie.title} ({selectedStreamLabel})
            </h3>
            <div className="flex items-center gap-2">
              {selectedVideo.link && (
                <a
                  href={getMediaProxyUrl(selectedVideo.link, {
                    download: true,
                    filename: getStreamDownloadFilename(movie.title, selectedVideo, selectedVideo.link),
                    stream: selectedVideo,
                  })}
                  download
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition"
                >
                  <Download size={14} />
                  <span>Download Video</span>
                </a>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsPlayerOpen(false)}>
                Close Player
              </Button>
            </div>
          </div>

          <VideoPlayer
            src={selectedVideo.link}
            poster={movie.backdrop_path || movie.poster_path}
            title={movie.title}
            qualities={videos}
            currentQuality={selectedVideo}
            onQualityChange={setSelectedVideoState}
            languages={languages}
            mediaId={movie.id}
            mediaType="movie"
            genresname={movie.genresname}
            genre={movie.genresname || (movie.genres && movie.genres[0]?.name) || ''}
            rating={movie.vote_average}
            year={movie.release_date ? String(movie.release_date).substring(0, 4) : ''}
            initialTime={effectiveInitialTime}
          />
        </div>
      )}

      {/* Main Movie Details Card */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl p-6 sm:p-8 md:p-10 bg-surface">
        {/* Background Backdrop Image with Blur */}
        {(movie.backdrop_path || movie.poster_path) && (
          <div
            className="absolute inset-0 bg-cover bg-center filter brightness-[0.22] blur-[3px] pointer-events-none scale-105"
            style={{ backgroundImage: `url(${movie.backdrop_path || movie.poster_path})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-darkbg via-darkbg/80 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-darkbg via-darkbg/85 to-transparent hidden md:block pointer-events-none" />

        {/* Layout: Desktop (Poster Left, Details Right) | Mobile (Poster Centered, Details Below) */}
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
          {/* Poster Column */}
          <div className="relative w-44 sm:w-52 md:w-64 lg:w-72 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-surface flex-shrink-0 mx-auto md:mx-0 hover:scale-105 transition-transform duration-300">
            <img
              src={movie.poster_path || movie.backdrop_path}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
            {/* Badges on Poster Card Top Edges */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
              {(movie.quality || movie.subtitle) ? (
                <span className="px-2 py-0.5 text-[10px] sm:text-xs font-bold rounded-lg bg-blue-600 text-white shadow-md">
                  {movie.quality || movie.subtitle}
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
            {/* 1. Title moved above HD, ratings, etc. */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-tight drop-shadow-md">
              {movie.title}
            </h1>

            {/* Tagline */}
            {movie.tagline && (
              <p className="text-xs sm:text-sm text-blue-300/90 italic font-medium">
                "{movie.tagline}"
              </p>
            )}

            {/* 2. Metadata Row: Year, Runtime, Views */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-gray-300 font-medium">
              {displayYear && (
                <span className="px-2 py-0.5 rounded-lg bg-surface-elevated text-gray-300 border border-white/5">
                  {displayYear}
                </span>
              )}

              {movie.runtime && (
                <span className="px-2 py-0.5 rounded-lg bg-surface-elevated text-gray-300 border border-white/5">
                  {formatRuntime(movie.runtime)}
                </span>
              )}

              {movie.views > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-surface-elevated text-gray-300 border border-white/5">
                  {Number(movie.views).toLocaleString()} views
                </span>
              )}
            </div>

            {/* 3. Genre Chips */}
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

            {/* 4. Actions Bar: 2-per-row on mobile, 1-line on desktop, single-line text */}
            <div className="grid grid-cols-2 md:flex md:flex-row md:flex-nowrap md:items-center md:justify-start gap-2.5 pt-2 w-full md:w-auto">
              {/* Primary Watch Movie Button */}
              {videos.length > 0 && (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full md:w-auto justify-center text-xs font-bold whitespace-nowrap shadow-lg shadow-blue-600/30 px-3 py-2.5"
                  onClick={() => handleStartPlay(selectedVideo)}
                  icon={<Play size={15} className="fill-current flex-shrink-0" />}
                >
                  <span className="whitespace-nowrap truncate">Watch Movie</span>
                </Button>
              )}

              {/* Reduced size Stream Selector Dropdown Button with ample padding */}
              {videos.length > 1 && (
                <div className="relative w-full md:w-auto" ref={streamDropdownRef}>
                  <button
                    onClick={() => setIsStreamMenuOpen(!isStreamMenuOpen)}
                    className="w-full md:w-auto h-full px-3 py-2.5 rounded-xl bg-surface-elevated hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 flex items-center justify-center gap-1.5 transition shadow whitespace-nowrap"
                    title="Select Stream Server"
                  >
                    <span className="whitespace-nowrap truncate max-w-[95px] sm:max-w-[120px]">{selectedStreamLabel}</span>
                    <ChevronDown size={13} className={`text-gray-400 transition-transform flex-shrink-0 ${isStreamMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Compact Quality / Stream Dropdown Menu with padding on all sides */}
                  {isStreamMenuOpen && (
                    <div className="absolute left-0 bottom-full mb-2 w-48 glass-dropdown rounded-xl shadow-2xl p-1.5 z-40 border border-gray-700 bg-darkbg">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-2 py-0.5 border-b border-white/10">
                        Choose Stream
                      </p>
                      <div className="space-y-0.5 mt-1 max-h-40 overflow-y-auto no-scrollbar">
                        {videos.map((v, i) => {
                          const isSelected = (selectedVideo?.id === v.id) || (!selectedVideo && i === 0);
                          return (
                            <button
                              key={v.id || i}
                              onClick={() => {
                                setSelectedVideoState(v);
                                setIsStreamMenuOpen(false);
                                if (isPlayerOpen) {
                                  handleStartPlay(v);
                                }
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition flex items-center justify-between ${
                                isSelected
                                  ? 'bg-blue-600/25 text-blue-400 font-bold border border-blue-500/30'
                                  : 'text-gray-300 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <div className="truncate">
                                <span className="font-semibold">{v.server || v.video_name || `Server ${i + 1}`}</span>
                                {v.lang && <span className="text-[9px] text-gray-400 block">{v.lang}</span>}
                              </div>
                              {isSelected && <Check size={12} className="text-blue-400 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Trailer Button */}
              {(movie.preview_path || movie.trailer_url) && (
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

              {/* Direct Download Button */}
              {selectedVideo?.link && (
                <a
                  href={getMediaProxyUrl(selectedVideo.link, {
                    download: true,
                    filename: getStreamDownloadFilename(movie.title, selectedVideo, selectedVideo.link),
                    stream: selectedVideo,
                  })}
                  download
                  className="w-full md:w-auto block"
                >
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full md:w-auto justify-center text-xs font-semibold whitespace-nowrap px-3 py-2.5"
                    icon={<Download size={15} className="flex-shrink-0" />}
                  >
                    <span className="whitespace-nowrap truncate">Download</span>
                  </Button>
                </a>
              )}
            </div>

            {/* 5. Synopsis Section with Languages placed start-left below synopsis */}
            <div className="text-left w-full pt-4 border-t border-white/10 space-y-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1.5">Synopsis</h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-normal">
                  {movie.overview || 'No synopsis available for this movie.'}
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

              {/* Production Companies line if available */}
              {productionCompanies.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400 text-left justify-start">
                  <Building size={13} className="text-gray-500 flex-shrink-0" />
                  <span>Production: </span>
                  <strong className="text-gray-300 font-medium">
                    {productionCompanies.map((c) => (typeof c === 'object' ? c.name : c)).join(', ')}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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

      {/* Related Movies Section */}
      {relatedMovies.length > 0 && (
        <MediaCarousel
          title="Related Movies"
          items={relatedMovies}
          type="movie"
        />
      )}

      {/* Trailer Modal */}
      {isTrailerOpen && (
        <TrailerModal
          isOpen={isTrailerOpen}
          onClose={() => setIsTrailerOpen(false)}
          title={movie.title}
          previewPath={movie.preview_path}
          trailerUrl={movie.trailer_url}
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

export default MovieDetails;
