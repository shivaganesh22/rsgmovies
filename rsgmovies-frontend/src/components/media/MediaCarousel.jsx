import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from './MediaCard';
import { MediaCardSkeleton } from '../ui/Skeleton';

export const MediaCarousel = ({
  title,
  items = [],
  viewAllLink,
  isLoading = false,
  type = 'movie',
  aspectRatio,
}) => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -500 : 500;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const isEpisodes =
    type === 'episode' ||
    Boolean(title && typeof title === 'string' && title.toLowerCase().includes('episode'));

  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <section className="my-7">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {viewAllLink && (
            <Link
              to={viewAllLink}
              className="text-xs sm:text-sm font-semibold text-blue-400 hover:text-blue-300 transition mr-2"
            >
              View All &rarr;
            </Link>
          )}
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white transition border border-white/5"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-gray-700 text-gray-300 hover:text-white transition border border-white/5"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Carousel Track */}
      <div
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-3 pt-1 snap-x scroll-smooth"
      >
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`snap-start flex-shrink-0 ${
                  isEpisodes
                    ? 'w-[200px] sm:w-[240px] md:w-[270px]'
                    : 'w-[125px] sm:w-[155px] md:w-[185px]'
                }`}
              >
                <MediaCardSkeleton />
              </div>
            ))
          : items.map((item, index) => (
              <div
                key={item.id || item.link || index}
                className={`snap-start flex-shrink-0 ${
                  isEpisodes
                    ? 'w-[200px] sm:w-[240px] md:w-[270px]'
                    : 'w-[125px] sm:w-[155px] md:w-[185px]'
                }`}
              >
                <MediaCard
                  {...item}
                  type={item.type || type}
                  aspectRatio={isEpisodes ? '4:3' : (aspectRatio || '2:3')}
                />
              </div>
            ))}
      </div>
    </section>
  );
};

export default MediaCarousel;
