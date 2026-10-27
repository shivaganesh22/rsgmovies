import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Play, Info, Star, Film, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import blastApi from '../../api/blast';
import MediaCarousel from '../../components/media/MediaCarousel';
import ContinueWatchingCarousel from '../../components/media/ContinueWatchingCarousel';
import TrailerModal from '../../components/media/TrailerModal';
import { BannerSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import Button from '../../components/ui/Button';

export const Home = () => {
  const navigate = useNavigate();
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [trailerItem, setTrailerItem] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['blastHome'],
    queryFn: () => blastApi.getHome(),
    staleTime: 1000 * 60 * 10,
  });

  const featured = Array.isArray(data?.featured) ? data.featured : [];

  // Auto-advance featured spotlight
  useEffect(() => {
    if (featured.length > 1) {
      const interval = setInterval(() => {
        setFeaturedIndex((prev) => (prev + 1) % featured.length);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [featured.length]);

  const handlePrevSlide = (e) => {
    e?.stopPropagation();
    setFeaturedIndex((prev) => (prev === 0 ? featured.length - 1 : prev - 1));
  };

  const handleNextSlide = (e) => {
    e?.stopPropagation();
    setFeaturedIndex((prev) => (prev + 1) % featured.length);
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <BannerSkeleton />
        <div className="space-y-8">
          <MediaCarousel title="Pinned Content" isLoading={true} />
          <MediaCarousel title="New HD Released" isLoading={true} />
          <MediaCarousel title="Latest Movies" isLoading={true} />
          <MediaCarousel title="Latest Episodes" isLoading={true} />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={refetch} message="Could not load media catalog. Please try again." />;
  }

  const currentFeatured = featured[featuredIndex] || featured[0];
  const typeLower = String(currentFeatured?.type || '').toLowerCase();
  const isFeaturedSeries =
    typeLower === 'serie' ||
    typeLower === 'series' ||
    typeLower === 'tv' ||
    typeLower === 'anime' ||
    Boolean(currentFeatured?.seasons);

  // Use featured_id for navigation in Hero Slider
  const targetId = currentFeatured?.featured_id || currentFeatured?.id;
  const featuredTargetLink = currentFeatured
    ? isFeaturedSeries
      ? `/series/${targetId}`
      : `/movies/${targetId}`
    : '/';

  const displayYear = currentFeatured?.release_date
    ? String(currentFeatured.release_date).substring(0, 4)
    : currentFeatured?.first_air_date
    ? String(currentFeatured.first_air_date).substring(0, 4)
    : '';

  const displayRating = Number(currentFeatured?.vote_average || 0);

  // Extract rvcontent "New HD Released"
  const newHdItems = Array.isArray(data?.rvcontent?.['New HD Released'])
    ? data.rvcontent['New HD Released']
    : Array.isArray(data?.new_hd)
    ? data.new_hd
    : [];

  const pinnedItems = Array.isArray(data?.pinned) ? data.pinned : [];
  const latestMoviesItems = Array.isArray(data?.latest_movies)
    ? data.latest_movies
    : Array.isArray(data?.latestMovies)
    ? data.latestMovies
    : [];
  const latestEpisodesItems = Array.isArray(data?.latest_episodes)
    ? data.latest_episodes
    : Array.isArray(data?.latestEpisodes)
    ? data.latestEpisodes
    : [];
  const recommendedItems = Array.isArray(data?.recommended) ? data.recommended : [];
  const trendingItems = Array.isArray(data?.trending) ? data.trending : [];
  const choosedItems = Array.isArray(data?.choosed) ? data.choosed : [];
  const popularSeriesItems = Array.isArray(data?.popular_series)
    ? data.popular_series
    : Array.isArray(data?.popularSeries)
    ? data.popularSeries
    : [];
  const recentlyAddedItems = Array.isArray(data?.recently_added)
    ? data.recently_added
    : Array.isArray(data?.recents)
    ? data.recents
    : Array.isArray(data?.latest)
    ? data.latest
    : [];
  const latestSeriesItems = Array.isArray(data?.latest_series) ? data.latest_series : [];
  const nextThisWeekItems = Array.isArray(data?.next_this_week)
    ? data.next_this_week
    : Array.isArray(data?.thisweek)
    ? data.thisweek
    : [];
  const mostPopularItems = Array.isArray(data?.most_popular)
    ? data.most_popular
    : Array.isArray(data?.popular)
    ? data.popular
    : [];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Hero Spotlight Banner */}
      {currentFeatured && (
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 group bg-surface">
          {/* Backdrop Image with Dark Gradient & Blur */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={
                currentFeatured.backdrop_path ||
                currentFeatured.backdrop_path_tv ||
                currentFeatured.poster_path
              }
              alt={currentFeatured.title || currentFeatured.name}
              className="w-full h-full object-cover filter brightness-[0.35] blur-[1px] transform scale-105 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-darkbg via-darkbg/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-darkbg/50 via-transparent to-darkbg" />
            <div className="absolute inset-0 bg-gradient-to-r from-darkbg via-darkbg/80 to-transparent hidden md:block" />
          </div>

          {/* Left & Right Circular Navigation Arrows */}
          {featured.length > 1 && (
            <>
              <button
                onClick={handlePrevSlide}
                className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/15 transition shadow-xl"
                aria-label="Previous slide"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleNextSlide}
                className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/15 transition shadow-xl"
                aria-label="Next slide"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          {/* Responsive Layout:
              - Mobile & Desktop: Left-aligned, title first, metadata row below.
          */}
          <div className="relative z-10 w-full p-5 sm:p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
            {/* Poster Card (Centered on Mobile, Left on Desktop) */}
            {(currentFeatured.poster_path || currentFeatured.miniposter) && (
              <div
                onClick={() => navigate(featuredTargetLink)}
                className="relative w-32 sm:w-40 md:w-52 lg:w-60 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-surface flex-shrink-0 cursor-pointer hover:scale-105 transition-transform duration-300 mx-auto md:mx-0"
              >
                <img
                  src={currentFeatured.poster_path || currentFeatured.miniposter}
                  alt={currentFeatured.title || currentFeatured.name}
                  className="w-full h-full object-cover"
                />

                {/* Badges on Poster Card Bottom */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                  {currentFeatured.quality ? (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-600 text-white shadow">
                      {currentFeatured.quality}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-600 text-white shadow">
                      HD
                    </span>
                  )}
                  {displayRating > 0 && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-black/80 text-amber-400 backdrop-blur-sm border border-amber-400/20 shadow">
                      <Star size={9} className="fill-amber-400 text-amber-400" />
                      {displayRating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Details (Left-aligned: title, metadata, overview, buttons) */}
            <div className="flex-1 flex flex-col items-start text-left space-y-3 w-full">
              {/* Title (Positioned at top) */}
              <h1
                onClick={() => navigate(featuredTargetLink)}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md cursor-pointer hover:text-blue-400 transition-colors"
              >
                {currentFeatured.title || currentFeatured.name}
              </h1>

              {/* Metadata Row below Title (Year, Genre) */}
              <div className="flex flex-wrap items-center justify-start gap-2">
                {displayYear && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-surface-elevated text-gray-300 border border-white/5">
                    {displayYear}
                  </span>
                )}
                {currentFeatured.genre && (
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-lg bg-white/10 text-gray-300 border border-white/5">
                    {currentFeatured.genre}
                  </span>
                )}
              </div>

              {/* Overview */}
              {currentFeatured.overview && (
                <p className="text-xs sm:text-sm md:text-base text-gray-300 line-clamp-3 font-normal drop-shadow max-w-2xl text-left">
                  {currentFeatured.overview}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-start gap-2.5 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate(featuredTargetLink)}
                  icon={<Play size={16} className="fill-current" />}
                >
                  Watch Now
                </Button>

                {(currentFeatured.preview_path || currentFeatured.trailer_url) && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setTrailerItem(currentFeatured)}
                    icon={<Film size={16} />}
                  >
                    Trailer
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => navigate(featuredTargetLink)}
                  icon={<Info size={16} />}
                >
                  Details
                </Button>
              </div>

              {/* Indicator Dots (Centered) */}
              {featured.length > 1 && (
                <div className="w-full flex items-center justify-center gap-1.5 pt-3">
                  {featured.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFeaturedIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        featuredIndex === i ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/40 hover:bg-white/70'
                      }`}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Discovery Carousels in Android TV App Order */}
      <div className="space-y-6">
        {/* Continue Watching Section (Recently Watched with Progress) */}
        <ContinueWatchingCarousel />

        {/* 1. Pinned Content */}
        {pinnedItems.length > 0 && (
          <MediaCarousel
            title="Pinned Content"
            items={pinnedItems}
            viewAllLink="/blast/viewall/pinned"
          />
        )}

        {/* 2. New HD Released */}
        {newHdItems.length > 0 && (
          <MediaCarousel
            title="New HD Released"
            items={newHdItems}
            viewAllLink="/blast/viewall/new_hd"
          />
        )}

        {/* 3. Latest Movies */}
        {latestMoviesItems.length > 0 && (
          <MediaCarousel
            title="Latest Movies"
            items={latestMoviesItems}
            type="movie"
            viewAllLink="/blast/viewall/latest_movies"
          />
        )}

        {/* 4. Latest Episodes */}
        {latestEpisodesItems.length > 0 && (
          <MediaCarousel
            title="Latest Episodes"
            items={latestEpisodesItems}
            type="episode"
            aspectRatio="4:3"
            viewAllLink="/blast/viewall/latest_series_episodes"
          />
        )}

        {/* 5. Recommended For You */}
        {recommendedItems.length > 0 && (
          <MediaCarousel
            title="Recommended For You"
            items={recommendedItems}
            viewAllLink="/blast/viewall/recommended"
          />
        )}

        {/* 6. Trending Now */}
        {trendingItems.length > 0 && (
          <MediaCarousel
            title="Trending Now"
            items={trendingItems}
            viewAllLink="/blast/viewall/trending"
          />
        )}

        {/* 7. Choosed For You */}
        {choosedItems.length > 0 && (
          <MediaCarousel
            title="Choosed For You"
            items={choosedItems}
            viewAllLink="/blast/viewall/choosed"
          />
        )}

        {/* 8. Popular Series */}
        {popularSeriesItems.length > 0 && (
          <MediaCarousel
            title="Popular Series"
            items={popularSeriesItems}
            type="series"
            viewAllLink="/blast/viewall/popular_series"
          />
        )}

        {/* 9. Recently Added */}
        {recentlyAddedItems.length > 0 && (
          <MediaCarousel
            title="Recently Added"
            items={recentlyAddedItems}
            viewAllLink="/blast/viewall/recents"
          />
        )}

        {/* 10. Latest Series */}
        {latestSeriesItems.length > 0 && (
          <MediaCarousel
            title="Latest Series"
            items={latestSeriesItems}
            type="series"
            viewAllLink="/blast/viewall/latest_series"
          />
        )}

        {/* 11. New This Week */}
        {nextThisWeekItems.length > 0 && (
          <MediaCarousel
            title="New This Week"
            items={nextThisWeekItems}
            viewAllLink="/blast/viewall/thisweek"
          />
        )}

        {/* 12. Most Popular */}
        {mostPopularItems.length > 0 && (
          <MediaCarousel
            title="Most Popular"
            items={mostPopularItems}
            viewAllLink="/blast/viewall/popular"
          />
        )}
      </div>

      {/* Trailer Modal */}
      {trailerItem && (
        <TrailerModal
          isOpen={Boolean(trailerItem)}
          onClose={() => setTrailerItem(null)}
          title={trailerItem.title || trailerItem.name}
          previewPath={trailerItem.preview_path}
          trailerUrl={trailerItem.trailer_url}
        />
      )}
    </div>
  );
};

export default Home;
