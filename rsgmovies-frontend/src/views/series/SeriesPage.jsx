import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Filter, SortAsc, Search, X } from 'lucide-react';
import blastApi from '../../api/blast';
import MediaGrid from '../../components/media/MediaGrid';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';

export const SeriesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentGenre = searchParams.get('genre') || '';
  const currentSort = searchParams.get('sort') || 'latestadded';
  const currentSearch = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(currentSearch);

  // Fetch Genres List
  const { data: genresData } = useQuery({
    queryKey: ['blastGenres'],
    queryFn: () => blastApi.getGenres(),
    staleTime: 1000 * 60 * 60,
  });

  const genresList = Array.isArray(genresData) ? genresData : genresData?.genres || [];

  // Infinite Query for Auto-Loaded Pagination
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['blastSeriesInfinite', currentGenre, currentSort, currentSearch],
    queryFn: async ({ pageParam = 1 }) => {
      if (currentSearch) {
        const res = await blastApi.search(currentSearch);
        const list = res?.search || res?.series || (Array.isArray(res) ? res : []);
        return {
          items: list,
          page: pageParam,
          hasMore: false,
        };
      }

      if (currentGenre) {
        const res = await blastApi.getSeriesByGenre(currentGenre, pageParam);
        const rawItems = Array.isArray(res) ? res : res?.data || res?.series || [];
        const items = rawItems.map((it) => ({
          ...it,
          type: 'series',
          genre: it.genre || it.genreslist || it.genres || currentGenre,
        }));
        return {
          items,
          page: pageParam,
          hasMore: Boolean(res?.next_page_url || items.length >= 10),
        };
      }

      const res = (currentSort === 'all')
        ? await blastApi.getSeries(pageParam)
        : await blastApi.getSeriesFilter(currentSort, pageParam);

      const rawItems = Array.isArray(res) ? res : res?.data || res?.series || [];
      const items = rawItems.map((it) => ({
        ...it,
        type: 'series',
      }));
      const hasMore = Boolean(res?.next_page_url || items.length >= 10);

      return {
        items,
        page: pageParam,
        hasMore,
      };
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
    staleTime: 1000 * 60 * 5,
  });

  // Seamless Infinite Scroll Intersection Observer & Window Scroll Listener
  useEffect(() => {
    let observer;
    const sentinel = document.getElementById('series-scroll-sentinel');

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

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('q', searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const allSeries = React.useMemo(() => {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
          TV Series
        </h1>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-sm w-full">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search series..."
            icon={<Search size={16} />}
          />
          <Button variant="secondary" size="md" type="submit">
            Search
          </Button>
        </form>
      </div>

      {/* Filter & Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-3 sm:p-4 rounded-2xl border border-white/5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Genre Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-gray-400" />
            <select
              value={currentGenre}
              onChange={(e) => updateParam('genre', e.target.value)}
              className="bg-surface-elevated text-xs sm:text-sm text-white rounded-xl border border-gray-700 px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="">All Genres</option>
              {genresList.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown: latestadded, byrating, byviews, byyear */}
          {!currentGenre && !currentSearch && (
            <div className="flex items-center gap-1.5">
              <SortAsc size={14} className="text-gray-400" />
              <select
                value={currentSort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="bg-surface-elevated text-xs sm:text-sm text-white rounded-xl border border-gray-700 px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="latestadded">Latest Added</option>
                <option value="all">All Series</option>
                <option value="byrating">By Rating</option>
                <option value="byviews">By Views</option>
                <option value="byyear">By Year</option>
              </select>
            </div>
          )}

          {/* Clear Filters Button */}
          {(currentGenre || currentSearch || currentSort !== 'latestadded') && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium px-2 py-1 rounded-lg hover:bg-blue-500/10 transition"
            >
              <X size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>

        <span className="text-xs text-gray-400">
          <strong className="text-white">{allSeries.length}</strong> series
        </span>
      </div>

      {/* Series Grid (3 items/row on mobile) */}
      {isError ? (
        <ErrorState onRetry={refetch} message="Failed to load series. Please try again." />
      ) : (
        <MediaGrid
          items={allSeries}
          isLoading={isLoading}
          type="series"
          emptyTitle="No series found"
          emptyMessage="Try selecting a different genre or clearing your search filter."
        />
      )}

      {/* Infinite Scroll Sentinel */}
      <div id="series-scroll-sentinel" className="py-6 flex justify-center">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-surface-elevated text-gray-300 text-xs font-medium animate-pulse border border-white/5">
            <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading more series...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeriesPage;
