import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import blastApi from '../../api/blast';
import MediaGrid from '../../components/media/MediaGrid';
import ErrorState from '../../components/ui/ErrorState';

const categoryTitles = {
  pinned: 'Pinned Content',
  new_hd: 'New HD Released',
  latest_movies: 'Latest Movies',
  latest_episodes: 'Latest Episodes',
  latest_series_episodes: 'Latest Episodes',
  recommended: 'Recommended For You',
  trending: 'Trending Now',
  choosed: 'Choosed For You',
  popular_series: 'Popular Series',
  popularSeries: 'Popular Series',
  recents: 'Recently Added',
  recently_added: 'Recently Added',
  latest: 'Recently Added',
  latest_series: 'Latest Series',
  thisweek: 'New This Week',
  next_this_week: 'New This Week',
  popular: 'Most Popular',
  most_popular: 'Most Popular',
  top10: 'Top 10',
  movies: 'All Movies',
  series: 'All Series',
};

export const ViewAllPage = () => {
  const { category } = useParams();
  const navigate = useNavigate();

  const title = categoryTitles[category] || category?.replace(/_/g, ' ')?.toUpperCase() || 'Media Catalog';
  const isEpisodeCategory = category === 'latest_episodes' || category === 'latest_series_episodes';
  const isSeriesCategory =
    isEpisodeCategory ||
    category === 'popularSeries' ||
    category === 'popular_series' ||
    category === 'latest_series' ||
    category === 'series';

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['blastViewAll', category],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await blastApi.getCategoryItems(category, pageParam);
      return {
        items: Array.isArray(res) ? res : res?.data || res?.movies || res?.series || [],
        page: pageParam,
        hasMore: Boolean(res?.next_page_url || (Array.isArray(res) ? res.length >= 10 : res?.data?.length >= 10)),
      };
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5,
  });

  // Seamless Infinite Scroll Intersection Observer & Window Scroll Listener
  useEffect(() => {
    let observer;
    const sentinel = document.getElementById('viewall-scroll-sentinel');

    const handleScroll = (entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    if (sentinel) {
      observer = new IntersectionObserver(handleScroll, {
        rootMargin: '600px',
        threshold: 0,
      });
      observer.observe(sentinel);
    }

    // Window scroll fallback
    const onWindowScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 700 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    };
    window.addEventListener('scroll', onWindowScroll, { passive: true });

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('scroll', onWindowScroll);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allItems = React.useMemo(() => {
    const raw = data?.pages?.flatMap((page) => page.items) || [];
    const seen = new Set();
    return raw.filter((item) => {
      if (!item) return false;
      const key = item.id || item.title || item.name;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [data]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Category Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-surface-elevated hover:bg-gray-700 text-gray-400 hover:text-white transition"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
              {title}
            </h1>
          </div>
        </div>

        <span className="text-xs text-gray-400 font-medium">
          {allItems.length} items
        </span>
      </div>

      {/* Media Grid: 3 items/row on mobile for movies/series, 2 items/row in 4:3 for episodes */}
      {isError ? (
        <ErrorState onRetry={refetch} message="Failed to load items. Please try again." />
      ) : (
        <MediaGrid
          items={allItems}
          isLoading={isLoading}
          type={isEpisodeCategory ? 'episode' : isSeriesCategory ? 'series' : 'movie'}
          isEpisodeGrid={isEpisodeCategory}
          emptyMessage="No items found in this section."
        />
      )}

      {/* Infinite Scroll Sentinel */}
      <div id="viewall-scroll-sentinel" className="py-6 flex justify-center">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-surface-elevated text-gray-300 text-xs font-medium animate-pulse border border-white/5">
            <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading more...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAllPage;