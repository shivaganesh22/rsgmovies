import React from 'react';
import MediaCard from './MediaCard';
import { MediaCardSkeleton } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';

export const MediaGrid = ({
  items = [],
  isLoading = false,
  skeletonCount = 12,
  emptyTitle = 'No media found',
  emptyMessage = 'Try adjusting your filters or search terms.',
  type = 'movie',
  isEpisodeGrid = false,
}) => {
  const isEpisodes = type === 'episode' || isEpisodeGrid;

  // Grid columns: 2 per row for episodes (4:3 ratio), 3 per row for movies & series on mobile!
  const gridClasses = isEpisodes
    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4'
    : 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-4';

  if (isLoading) {
    return (
      <div className={gridClasses}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className={gridClasses}>
      {items.map((item, index) => (
        <MediaCard
          key={item.id || item.link || index}
          {...item}
          type={item.type || type}
          aspectRatio={isEpisodes ? '4:3' : '2:3'}
        />
      ))}
    </div>
  );
};

export default MediaGrid;
