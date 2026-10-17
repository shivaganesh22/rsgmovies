import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  Play,
  Info,
  Tv,
  Film,
  ChevronLeft,
  ChevronRight,
  Globe,
  Flame,
  ChevronRight as ArrowRight,
  X,
  Radio,
} from 'lucide-react';
import istreamApi from '../../api/istream';
import MediaCarousel from '../../components/media/MediaCarousel';
import { BannerSkeleton } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import VideoPlayer from '../../components/media/VideoPlayer';

export const getIStreamLink = (item, defaultType = 'movie') => {
  if (!item) return '/istream';
  
  if (item.content_id) {
    const cType = String(item.content_type || '').trim();
    if (cType === '1' || cType === 'webseries') {
      return `/istream/series/${item.content_id}`;
    }
    return `/istream/movie/${item.content_id}`;
  }

  const id = item.id || item.movie_id || item.series_id;
  const cType = String(item.content_type || '').trim();
  const typeStr = String(item.type || '').trim().toLowerCase();

  if (cType === '2' || cType === 'webseries' || typeStr === 'webseries' || typeStr === 'series' || defaultType === 'series') {
    return `/istream/series/${id}`;
  }
  return `/istream/movie/${id}`;
};

export const IStreamHome = () => {
  const navigate = useNavigate();
  const [heroIndex, setHeroIndex] = useState(0);
  const [selectedTvGenre, setSelectedTvGenre] = useState(null);
  const [activeLiveTvPlayer, setActiveLiveTvPlayer] = useState(null);

  // Scroll references for horizontal sections
  const networksRef = useRef(null);
  const liveTvGenreRef = useRef(null);
  const liveTvRef = useRef(null);
  const trendingRef = useRef(null);
  const exploreGenresRef = useRef(null);

  const scrollHorizontal = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const QUERY_OPTIONS = {
    staleTime: 1000 * 60 * 15, // 15 mins cache
    gcTime: 1000 * 60 * 30,    // 30 mins garbage collection
  };

  // 1. Hero Slider
  const { data: sliderData, isLoading: sliderLoading } = useQuery({
    queryKey: ['istreamSlider'],
    queryFn: () => istreamApi.getHomeSlider(),
    ...QUERY_OPTIONS,
  });

  // 2. Networks
  const { data: networksData } = useQuery({
    queryKey: ['istreamNetworks'],
    queryFn: () => istreamApi.getNetworks(),
    ...QUERY_OPTIONS,
  });

  // 4. Live TV Genres
  const { data: liveTvGenresData } = useQuery({
    queryKey: ['istreamLiveTvGenres'],
    queryFn: () => istreamApi.getLiveTvGenres(),
    ...QUERY_OPTIONS,
  });

  const liveTvGenres = Array.isArray(liveTvGenresData) ? liveTvGenresData : [];

  // Auto-select the first Live TV genre (e.g. iStreamTV) by default
  useEffect(() => {
    if (liveTvGenres.length > 0 && !selectedTvGenre) {
      setSelectedTvGenre(liveTvGenres[0].name);
    }
  }, [liveTvGenres, selectedTvGenre]);

  const activeGenreName = selectedTvGenre || (liveTvGenres[0]?.name || 'iStreamTV');

  // Live TV Channels by active genre
  const { data: genreLiveTvData, isFetching: isGenreLiveTvFetching } = useQuery({
    queryKey: ['istreamGenreLiveTv', activeGenreName],
    queryFn: () => istreamApi.getLiveTvByGenre(activeGenreName),
    enabled: Boolean(activeGenreName),
    ...QUERY_OPTIONS,
  });

  // 8. Trending
  const { data: trendingData } = useQuery({
    queryKey: ['istreamTrending'],
    queryFn: () => istreamApi.getTrending(),
    ...QUERY_OPTIONS,
  });

  // 9. Most Watched Movies
  const { data: mostWatchedMoviesData } = useQuery({
    queryKey: ['istreamMostWatchedMovies'],
    queryFn: () => istreamApi.getMostWatchedMovies(),
    ...QUERY_OPTIONS,
  });

  // 10. Most Watched WebSeries
  const { data: mostWatchedSeriesData } = useQuery({
    queryKey: ['istreamMostWatchedSeries'],
    queryFn: () => istreamApi.getMostWatchedSeries(),
    ...QUERY_OPTIONS,
  });

  // 11. Movies Only For You
  const { data: becauseWatchedMoviesData } = useQuery({
    queryKey: ['istreamBecauseWatchedMovies'],
    queryFn: () => istreamApi.getBecauseWatchedMovies('31205de9e1a245e2'),
    ...QUERY_OPTIONS,
  });

  // 12. Web Series Only For You
  const { data: becauseWatchedSeriesData } = useQuery({
    queryKey: ['istreamBecauseWatchedSeries'],
    queryFn: () => istreamApi.getBecauseWatchedSeries('31205de9e1a245e2'),
    ...QUERY_OPTIONS,
  });

  // 13. Recently Added Movies
  const { data: recentMoviesData } = useQuery({
    queryKey: ['istreamRecentMovies'],
    queryFn: () => istreamApi.getRecentMovies(),
    ...QUERY_OPTIONS,
  });

  // 14. Recently Added Web Series
  const { data: recentSeriesData } = useQuery({
    queryKey: ['istreamRecentSeries'],
    queryFn: () => istreamApi.getRecentSeries(),
    ...QUERY_OPTIONS,
  });

  // 15. Top Searched
  const { data: mostSearchedData } = useQuery({
    queryKey: ['istreamMostSearched'],
    queryFn: () => istreamApi.getMostSearched(),
    ...QUERY_OPTIONS,
  });

  // 16. Genre List
  const { data: genresData } = useQuery({
    queryKey: ['istreamGenres'],
    queryFn: () => istreamApi.getGenres(),
    ...QUERY_OPTIONS,
  });

  // 18. Random Movies
  const { data: randMoviesData } = useQuery({
    queryKey: ['istreamRandMovies'],
    queryFn: () => istreamApi.getRandMovies(),
    ...QUERY_OPTIONS,
  });

  // 19. Random WebSeries
  const { data: randSeriesData } = useQuery({
    queryKey: ['istreamRandSeries'],
    queryFn: () => istreamApi.getRandSeries(),
    ...QUERY_OPTIONS,
  });

  const sliderItems = Array.isArray(sliderData) ? sliderData : [];
  const networksList = Array.isArray(networksData) ? networksData : [];
  const activeLiveTvList = Array.isArray(genreLiveTvData) ? genreLiveTvData : [];
  const trendingList = Array.isArray(trendingData) ? trendingData : [];
  const genresList = Array.isArray(genresData) ? genresData : [];

  // Auto-advance hero banner slider
  useEffect(() => {
    if (sliderItems.length > 1) {
      const interval = setInterval(() => {
        setHeroIndex((prev) => (prev + 1) % sliderItems.length);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [sliderItems.length]);

  const currentHero = sliderItems[heroIndex] || sliderItems[0];

  const handleLiveTvClick = (ch) => {
    if (ch.url) {
      setActiveLiveTvPlayer(ch);
    } else {
      navigate(`/istream/movie/${ch.id}`);
    }
  };

  if (sliderLoading) {
    return (
      <div className="space-y-8 animate-fade-in p-4 sm:p-6">
        <BannerSkeleton />
        <div className="space-y-8">
          <MediaCarousel title="Networks" isLoading={true} />
          <MediaCarousel title="Trending" isLoading={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16 text-left">
      {/* Live TV Player Modal */}
      {activeLiveTvPlayer && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-4xl bg-darkbg border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Live TV: {activeLiveTvPlayer.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveLiveTvPlayer(null)}
                className="p-1.5 rounded-full bg-surface-elevated text-gray-300 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <VideoPlayer
                src={activeLiveTvPlayer.url}
                poster={activeLiveTvPlayer.banner || activeLiveTvPlayer.image}
                title={activeLiveTvPlayer.name}
                mediaId={`livetv_${activeLiveTvPlayer.id}`}
                mediaType="livetv"
              />
            </div>
          </div>
        </div>
      )}

      {/* 1. Hero Custom Image Slider */}
      {currentHero && (
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-surface group">
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={currentHero.banner || currentHero.poster}
              alt={currentHero.title || currentHero.name}
              className="w-full h-full object-cover filter brightness-[0.25] blur-[10px] transform scale-110 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-darkbg via-darkbg/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-darkbg via-darkbg/80 to-transparent hidden md:block" />
          </div>

          {sliderItems.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setHeroIndex((prev) => (prev === 0 ? sliderItems.length - 1 : prev - 1));
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/15 transition"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setHeroIndex((prev) => (prev + 1) % sliderItems.length);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/15 transition"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          <div className="relative z-10 w-full p-5 sm:p-8 flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {(currentHero.banner || currentHero.poster) && (
              <div
                onClick={() => navigate(getIStreamLink(currentHero))}
                className="relative w-36 sm:w-44 md:w-52 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-surface flex-shrink-0 cursor-pointer hover:scale-105 transition-transform duration-300 mx-auto md:mx-0"
              >
                <img
                  src={currentHero.banner || currentHero.poster}
                  alt={currentHero.title || currentHero.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-3 w-full">
              <h1
                onClick={() => navigate(getIStreamLink(currentHero))}
                className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight line-clamp-2 cursor-pointer hover:text-blue-400 transition"
              >
                {currentHero.title || currentHero.name}
              </h1>

              {currentHero.description && (
                <p className="text-xs sm:text-sm text-gray-300 line-clamp-3 font-normal max-w-2xl">
                  {currentHero.description}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate(getIStreamLink(currentHero))}
                  icon={<Play size={16} className="fill-current" />}
                >
                  Watch Now
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => navigate(getIStreamLink(currentHero))}
                  icon={<Info size={16} />}
                >
                  Details
                </Button>
              </div>

              {sliderItems.length > 1 && (
                <div className="w-full flex items-center justify-center md:justify-start gap-1.5 pt-2">
                  {sliderItems.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        heroIndex === i ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/40 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Networks Circular Row */}
      {networksList.length > 0 && (
        <div className="space-y-2 px-2 sm:px-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-gray-300 flex items-center gap-1.5">
              <Globe size={16} className="text-blue-400" />
              <span>Networks</span>
            </h2>
          </div>

          <div
            ref={networksRef}
            className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth"
          >
            {networksList.map((net) => (
              <div
                key={net.id}
                onClick={() => navigate(`/istream/network/${net.id}`)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface-elevated border-2 border-white/10 p-2 flex items-center justify-center group-hover:border-blue-500 group-hover:scale-105 transition-all shadow-md">
                  <img
                    src={net.logo || net.image || net.icon}
                    alt={net.name}
                    className="w-full h-full object-contain rounded-full"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <Globe size={20} className="text-gray-400 group-hover:text-blue-400" />
                </div>
                <span className="text-[11px] font-medium text-gray-300 group-hover:text-white truncate max-w-[70px]">
                  {net.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Live TV Genre List & Channels Section */}
      {liveTvGenres.length > 0 && (
        <div className="space-y-3 px-2 sm:px-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Radio size={14} className="text-red-500" />
                Live TV Categories:
              </span>
            </div>

            <div
              ref={liveTvGenreRef}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-smooth"
            >
              {liveTvGenres.map((g) => {
                const isActive = activeGenreName === g.name;
                return (
                  <button
                    key={g.id || g.name}
                    onClick={() => setSelectedTvGenre(g.name)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md font-bold ring-2 ring-blue-400/40'
                        : 'bg-surface-elevated text-gray-300 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live TV Channels Row */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Tv size={18} className="text-red-500" />
                <span>Live TV</span>
                <span className="text-xs font-normal text-blue-400">({activeGenreName})</span>
                {isGenreLiveTvFetching && (
                  <span className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin ml-1" />
                )}
              </h2>
              <div className="flex items-center gap-3">
                <Link
                  to="/istream/viewall/livetv"
                  className="text-xs font-semibold text-amber-500 hover:text-amber-400 flex items-center gap-0.5"
                >
                  <span>View All</span>
                  <ArrowRight size={14} />
                </Link>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => scrollHorizontal(liveTvRef, 'left')}
                    className="p-1 rounded-lg bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white border border-white/5 transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => scrollHorizontal(liveTvRef, 'right')}
                    className="p-1 rounded-lg bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white border border-white/5 transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={liveTvRef}
              className="relative min-h-[120px] flex gap-3 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth"
            >
              {isGenreLiveTvFetching && activeLiveTvList.length === 0 ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 w-44 sm:w-52 aspect-[4/3] rounded-2xl bg-surface-elevated animate-pulse border border-white/5"
                  />
                ))
              ) : (
                activeLiveTvList.map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() => handleLiveTvClick(ch)}
                    className="relative flex-shrink-0 w-44 sm:w-52 aspect-[4/3] rounded-2xl overflow-hidden bg-surface border border-white/10 hover:border-red-500/50 cursor-pointer group shadow-lg transition-all hover:-translate-y-1"
                  >
                    <img
                      src={ch.banner || ch.image || ch.stream_icon}
                      alt={ch.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-extrabold shadow animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      LIVE
                    </div>

                    <div className="absolute bottom-2 left-2 right-2 text-left">
                      <p className="text-xs font-bold text-white truncate">{ch.name}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Trending Section (getTrending with hollow outline numbers and smooth scroll) */}
      {trendingList.length > 0 && (
        <div className="space-y-3 px-2 sm:px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Flame size={18} className="text-amber-500" />
              <span>Trending</span>
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollHorizontal(trendingRef, 'left')}
                className="p-1 rounded-lg bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white border border-white/5 transition"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => scrollHorizontal(trendingRef, 'right')}
                className="p-1 rounded-lg bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white border border-white/5 transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div
            ref={trendingRef}
            className="flex gap-4 overflow-x-auto no-scrollbar py-3 px-1 scroll-smooth"
          >
            {trendingList.map((item, idx) => {
              const tag = item.custom_tag?.custom_tags_name || item.badge || item.quality;
              const link = getIStreamLink(item);
              return (
                <div
                  key={item.id || idx}
                  onClick={() => navigate(link)}
                  className="relative flex-shrink-0 w-32 sm:w-40 aspect-[2/3] rounded-2xl overflow-hidden bg-surface border border-white/10 hover:border-amber-500/50 cursor-pointer group shadow-xl transition-all hover:-translate-y-1"
                >
                  <img
                    src={item.poster || item.poster_path || item.banner || item.miniposter}
                    alt={item.title || item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {tag && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-red-600/90 text-white shadow backdrop-blur-sm">
                      {tag}
                    </span>
                  )}

                  <div className="absolute -bottom-2 left-1 z-10 select-none pointer-events-none">
                    <span className="text-6xl sm:text-7xl font-black text-transparent stroke-text tracking-tighter drop-shadow-lg">
                      {idx + 1}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 9. Most Popular Movies */}
      {Array.isArray(mostWatchedMoviesData) && mostWatchedMoviesData.length > 0 && (
        <MediaCarousel
          title="Most Popular Movies"
          items={mostWatchedMoviesData.map((i) => ({
            ...i,
            targetLink: getIStreamLink(i, 'movie'),
            badge: i.custom_tag?.custom_tags_name || i.quality || i.badge,
          }))}
        />
      )}

      {/* 10. Most Popular WebSeries */}
      {Array.isArray(mostWatchedSeriesData) && mostWatchedSeriesData.length > 0 && (
        <MediaCarousel
          title="Most Popular WebSeries"
          items={mostWatchedSeriesData.map((i) => ({
            ...i,
            targetLink: getIStreamLink(i, 'series'),
            badge: i.custom_tag?.custom_tags_name || i.quality || i.badge,
          }))}
          type="series"
        />
      )}

      {/* 11. Movies Only For You */}
      {Array.isArray(becauseWatchedMoviesData) && becauseWatchedMoviesData.length > 0 && (
        <MediaCarousel
          title="Movies Only For You"
          items={becauseWatchedMoviesData.map((i) => ({
            ...i,
            targetLink: getIStreamLink(i, 'movie'),
            badge: i.custom_tag?.custom_tags_name || i.quality || i.badge,
          }))}
        />
      )}

      {/* 12. Web Series Only For You */}
      {Array.isArray(becauseWatchedSeriesData) && becauseWatchedSeriesData.length > 0 && (
        <MediaCarousel
          title="Web Series Only For You"
          items={becauseWatchedSeriesData.map((i) => ({
            ...i,
            targetLink: getIStreamLink(i, 'series'),
            badge: i.custom_tag?.custom_tags_name || i.quality || i.badge,
          }))}
          type="series"
        />
      )}

      {/* 13. Recently Added Movies */}
      {Array.isArray(recentMoviesData) && recentMoviesData.length > 0 && (
        <MediaCarousel
          title="Recently Added Movies"
          items={recentMoviesData.map((i) => ({
            ...i,
            targetLink: getIStreamLink(i, 'movie'),
            badge: i.custom_tag?.custom_tags_name || i.quality || i.badge,
          }))}
          viewAllLink="/istream/viewall/movies"
        />
      )}

      {/* 14. Recently Added Web Series */}
      {Array.isArray(recentSeriesData) && recentSeriesData.length > 0 && (
        <MediaCarousel
          title="Recently Added Web Series"
          items={recentSeriesData.map((i) => ({
            ...i,
            targetLink: getIStreamLink(i, 'series'),
            badge: i.custom_tag?.custom_tags_name || i.quality || i.badge,
          }))}
          type="series"
          viewAllLink="/istream/viewall/series"
        />
      )}

      {/* 15. Top Searched */}
      {Array.isArray(mostSearchedData) && mostSearchedData.length > 0 && (
        <MediaCarousel
          title="Top Searched"
          items={mostSearchedData.map((i) => ({
            ...i,
            targetLink: getIStreamLink(i),
            badge: i.custom_tag?.custom_tags_name || i.quality || i.badge,
          }))}
        />
      )}

      {/* 16. Explore Genres (getGenreList -> getContentsReletedToGenre/:genrename) */}
      {genresList.length > 0 && (
        <div className="space-y-3 px-2 sm:px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Flame size={18} className="text-blue-400" />
              <span>Explore Genres</span>
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollHorizontal(exploreGenresRef, 'left')}
                className="p-1 rounded-lg bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white border border-white/5 transition"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => scrollHorizontal(exploreGenresRef, 'right')}
                className="p-1 rounded-lg bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white border border-white/5 transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div
            ref={exploreGenresRef}
            className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth"
          >
            {genresList.map((g, idx) => (
              <div
                key={g.id || idx}
                onClick={() => navigate(`/istream/genre/${encodeURIComponent(g.name || g.genre_name)}`)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-surface-elevated border-2 border-white/10 p-2 flex items-center justify-center group-hover:border-blue-500 group-hover:scale-105 transition-all shadow-md">
                  {g.icon ? (
                    <img
                      src={g.icon}
                      alt={g.name}
                      className="w-full h-full object-contain rounded-full"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600/40 to-indigo-600/40 text-blue-400 flex items-center justify-center text-sm font-black">
                      {(g.name || 'G').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-medium text-gray-300 group-hover:text-white truncate max-w-[75px]">
                  {g.name || g.genre_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 18. Movies */}
      {Array.isArray(randMoviesData) && randMoviesData.length > 0 && (
        <MediaCarousel
          title="Movies"
          items={randMoviesData.map((i) => ({
            ...i,
            targetLink: getIStreamLink(i, 'movie'),
            badge: i.custom_tag?.custom_tags_name || i.quality || i.badge,
          }))}
          viewAllLink="/istream/viewall/movies"
        />
      )}

      {/* 19. Web Series */}
      {Array.isArray(randSeriesData) && randSeriesData.length > 0 && (
        <MediaCarousel
          title="Web Series"
          items={randSeriesData.map((i) => ({
            ...i,
            targetLink: getIStreamLink(i, 'series'),
            badge: i.custom_tag?.custom_tags_name || i.quality || i.badge,
          }))}
          type="series"
          viewAllLink="/istream/viewall/series"
        />
      )}
    </div>
  );
};

export default IStreamHome;
