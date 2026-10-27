import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Info,
  Star,
  ChevronLeft,
  ChevronRight,
  Film,
} from 'lucide-react';
import movieboxApi from '../../api/moviebox';
import MediaCarousel from '../../components/media/MediaCarousel';
import { BannerSkeleton } from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import TrailerModal from '../../components/media/TrailerModal';

// Category order and matching rules as requested
const CATEGORY_DEFINITIONS = [
  { key: 'trending', position: 15, title: 'Trending Now', fallbackTitle: 'trending' },
  { key: 'south_indian', position: 120, title: 'South Indian', fallbackTitle: 'south indian' },
  { key: 'cinema', position: 100, title: 'Cinema', fallbackTitle: 'cinema' },
  { key: 'bollywood', position: 110, title: 'Bollywood', fallbackTitle: 'bollywood' },
  { key: 'indian_drama', position: 150, title: 'Indian Drama', fallbackTitle: 'indian drama' },
  { key: 'hollywood', position: 130, title: 'Hollywood', fallbackTitle: 'hollywood' },
  { key: 'anime', position: 160, title: 'Top Anime', fallbackTitle: 'anime' },
  { key: 'asian_series', position: 170, title: 'Best Asian Series', fallbackTitle: 'asian series' },
  { key: 'western_tv', position: 230, altPositions: [180], title: 'Western TV', fallbackTitle: 'western' },
  { key: 'free_now', position: 17, title: 'Free Now', fallbackTitle: 'free now' },
  { key: 'coming_soon', position: 30, title: 'Coming Soon', fallbackTitle: 'coming soon' },
];

export const MovieboxHome = () => {
  const navigate = useNavigate();
  const [heroIndex, setHeroIndex] = useState(0);
  const [trailerItem, setTrailerItem] = useState(null);

  const { data: homeData, isLoading, isError, refetch } = useQuery({
    queryKey: ['movieboxHome'],
    queryFn: () => movieboxApi.getHome(),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
  });

  const operatingList = useMemo(() => {
    return homeData?.data?.operatingList || [];
  }, [homeData]);

  // Extract Hero Slider Banner (position: 1 or type: BANNER)
  const heroItems = useMemo(() => {
    const bannerBlock = operatingList.find(
      (item) => item.position === 1 || item.type === 'BANNER' || item.banner?.items?.length > 0
    );
    return bannerBlock?.banner?.items || [];
  }, [operatingList]);

  // Auto-advance hero banner slider
  useEffect(() => {
    if (heroItems.length > 1) {
      const interval = setInterval(() => {
        setHeroIndex((prev) => (prev + 1) % heroItems.length);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [heroItems.length]);

  const handlePrevSlide = (e) => {
    e?.stopPropagation();
    setHeroIndex((prev) => (prev === 0 ? heroItems.length - 1 : prev - 1));
  };

  const handleNextSlide = (e) => {
    e?.stopPropagation();
    setHeroIndex((prev) => (prev + 1) % heroItems.length);
  };

  // Map operatingList categories in exact requested order
  // Language badges like "Hindi" removed per request
  const categories = useMemo(() => {
    if (!operatingList.length) return [];

    return CATEGORY_DEFINITIONS.map((def) => {
      const match = operatingList.find((item) => {
        if (item.position === def.position) return true;
        if (def.altPositions && def.altPositions.includes(item.position)) return true;
        if (item.title && item.title.toLowerCase().includes(def.fallbackTitle)) return true;
        return false;
      });

      if (!match || !match.subjects || !match.subjects.length) return null;

      const items = match.subjects.map((sub) => ({
        id: sub.subjectId,
        title: sub.title,
        poster: sub.cover?.url || sub.cover,
        image: sub.cover?.url || sub.cover,
        rating: sub.imdbRatingValue,
        vote_average: sub.imdbRatingValue,
        year: sub.releaseDate ? sub.releaseDate.substring(0, 4) : (sub.appointmentDate || ''),
        // Removed language badge ("Hindi"), only show Coming Soon if appointmentDate
        badge: sub.appointmentDate ? 'Coming Soon' : '',
        targetLink: `/moviebox/detail/${sub.subjectId}`,
        type: sub.subjectType === 2 ? 'series' : 'movie',
      }));

      return {
        key: def.key,
        title: def.title,
        items,
      };
    }).filter(Boolean);
  }, [operatingList]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in pb-16">
        <BannerSkeleton />
        <div className="space-y-6">
          <MediaCarousel title="Trending Now" isLoading={true} items={[]} />
          <MediaCarousel title="South Indian" isLoading={true} items={[]} />
          <MediaCarousel title="Cinema" isLoading={true} items={[]} />
        </div>
      </div>
    );
  }

  if (isError) {
    return <ErrorState onRetry={refetch} message="Could not load Moviebox home catalog." />;
  }

  const currentHero = heroItems[heroIndex] || heroItems[0];
  const heroSubject = currentHero?.subject || currentHero || {};
  const rawTitle = currentHero?.title || heroSubject?.title || 'Featured';
  const heroTitle = rawTitle.replace(/\[.*?\]/g, '').trim() || rawTitle;
  const heroBackdrop = currentHero?.image?.url || currentHero?.image || heroSubject?.cover?.url || heroSubject?.cover;
  const heroPoster =
    heroSubject?.cover?.url ||
    (typeof heroSubject?.cover === 'string' ? heroSubject.cover : '') ||
    currentHero?.cover?.url ||
    (typeof currentHero?.cover === 'string' ? currentHero.cover : '') ||
    currentHero?.image?.url ||
    heroBackdrop ||
    '';
  const heroRatingNum = Number(heroSubject?.imdbRatingValue || 0);
  const displayYear = heroSubject?.releaseDate ? String(heroSubject.releaseDate).substring(0, 4) : '';
  const heroGenre = heroSubject?.genre || '';
  const heroOverview = heroSubject?.description || heroSubject?.postTitle || '';
  const targetId = currentHero?.subjectId || heroSubject?.subjectId;
  const targetLink = targetId ? `/moviebox/detail/${targetId}` : '/moviebox';
  const isHeroSeries = heroSubject?.subjectType === 2 || currentHero?.subjectType === 2;
  const trailerUrl = heroSubject?.trailer?.videoAddress?.url || '';

  return (
    <div className="space-y-8 animate-fade-in pb-16 text-left">
      {/* Hero Spotlight Banner - Cloned from Blast Home Slider */}
      {currentHero && (
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 group bg-surface">
          {/* Backdrop Image with Dark Gradient & Blur */}
          <div className="absolute inset-0 overflow-hidden">
            {heroBackdrop && (
              <img
                src={heroBackdrop}
                alt={heroTitle}
                className="w-full h-full object-cover filter brightness-[0.35] blur-[1px] transform scale-105 transition-all duration-700"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-darkbg via-darkbg/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-darkbg/50 via-transparent to-darkbg" />
            <div className="absolute inset-0 bg-gradient-to-r from-darkbg via-darkbg/80 to-transparent hidden md:block" />
          </div>

          {/* Left & Right Circular Navigation Arrows */}
          {heroItems.length > 1 && (
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

          {/* Responsive Layout: Poster Left, Details Right */}
          <div className="relative z-10 w-full p-5 sm:p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
            {/* Poster Card */}
            {heroPoster && (
              <div
                onClick={() => navigate(targetLink)}
                className="relative w-32 sm:w-40 md:w-52 lg:w-60 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-surface flex-shrink-0 cursor-pointer hover:scale-105 transition-transform duration-300 mx-auto md:mx-0"
              >
                <img
                  src={heroPoster}
                  alt={heroTitle}
                  className="w-full h-full object-cover"
                />

                {/* Badges on Poster Card Bottom */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-600 text-white shadow">
                    {isHeroSeries ? 'SERIES' : 'HD'}
                  </span>
                  {heroRatingNum > 0 && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-black/80 text-amber-400 backdrop-blur-sm border border-amber-400/20 shadow">
                      <Star size={9} className="fill-amber-400 text-amber-400" />
                      {heroRatingNum.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Details (Left-aligned: title, metadata, overview, buttons) */}
            <div className="flex-1 flex flex-col items-start text-left space-y-3 w-full">
              {/* Title */}
              <h1
                onClick={() => navigate(targetLink)}
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-display text-white tracking-tight leading-tight line-clamp-2 drop-shadow-md cursor-pointer hover:text-blue-400 transition-colors"
              >
                {heroTitle}
              </h1>

              {/* Metadata Row below Title */}
              <div className="flex flex-wrap items-center justify-start gap-2">
                {displayYear && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-surface-elevated text-gray-300 border border-white/5">
                    {displayYear}
                  </span>
                )}
                {heroGenre && (
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-lg bg-white/10 text-gray-300 border border-white/5">
                    {heroGenre}
                  </span>
                )}
              </div>

              {/* Overview */}
              {heroOverview && (
                <p className="text-xs sm:text-sm md:text-base text-gray-300 line-clamp-3 font-normal drop-shadow max-w-2xl text-left">
                  {heroOverview}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-start gap-2.5 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate(targetLink)}
                  icon={<Play size={16} className="fill-current" />}
                >
                  Watch Now
                </Button>

                {trailerUrl && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => setTrailerItem({
                      title: heroTitle,
                      trailer_url: trailerUrl,
                    })}
                    icon={<Film size={16} />}
                  >
                    Trailer
                  </Button>
                )}
              </div>

              {/* Indicator Dots (Centered) */}
              {heroItems.length > 1 && (
                <div className="w-full flex items-center justify-center gap-1.5 pt-3">
                  {heroItems.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setHeroIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        heroIndex === i ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/30 hover:bg-white/60'
                      }`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trailer Modal */}
      {trailerItem && (
        <TrailerModal
          isOpen={Boolean(trailerItem)}
          onClose={() => setTrailerItem(null)}
          title={trailerItem.title}
          trailerUrl={trailerItem.trailer_url}
        />
      )}

      {/* Categories Sections in exact requested order */}
      <div className="space-y-4">
        {categories.map((cat) => (
          <MediaCarousel
            key={cat.key}
            title={cat.title}
            items={cat.items}
          />
        ))}
      </div>
    </div>
  );
};

export default MovieboxHome;
