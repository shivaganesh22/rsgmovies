import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Film, Tv, Sparkles, X, Loader2 } from 'lucide-react';
import istreamApi from '../../api/istream';
import MediaCard from '../../components/media/MediaCard';
import { CardSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';
import VideoPlayer from '../../components/media/VideoPlayer';
import { getIStreamLink } from './IStreamHome';

export const IStreamViewAll = () => {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [accumulatedItems, setAccumulatedItems] = useState([]);
  const [activeLiveTvPlayer, setActiveLiveTvPlayer] = useState(null);

  const rawCategory = params.category;
  const id = params.id;
  const category = rawCategory || (location.pathname.includes('/network/') ? 'network' : location.pathname.includes('/genre/') ? 'genre' : 'movies');

  const isPaginated = category === 'movies' || category === 'series';

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['istreamViewAll', category, id, page],
    queryFn: () => {
      if (category === 'movies') {
        return istreamApi.getAllMovies(page);
      } else if (category === 'series') {
        return istreamApi.getAllSeries(page);
      } else if (category === 'network' && id) {
        return istreamApi.getNetworkContent(id);
      } else if (category === 'genre' && id) {
        return istreamApi.getContentsByGenre(id);
      } else if (category === 'livetv') {
        return istreamApi.getAllLiveTv();
      }
      return istreamApi.getAllMovies(page);
    },
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
  });

  // Extract items to display cleanly for movies, series, networks, genres, and live tv
  const displayItems = React.useMemo(() => {
    if (isPaginated && accumulatedItems.length > 0) {
      return accumulatedItems;
    }
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object') {
      if (Array.isArray(data.items)) return data.items;
      if (Array.isArray(data.movies)) return data.movies;
      if (Array.isArray(data.series)) return data.series;
      if (Array.isArray(data.channels)) return data.channels;
      if (Array.isArray(data.data)) return data.data;
      return Object.values(data).filter((i) => i && typeof i === 'object' && (i.id || i.name || i.title));
    }
    return [];
  }, [data, accumulatedItems, isPaginated]);

  // Accumulate items for auto pagination on scrolling
  useEffect(() => {
    if (data) {
      const newItems = Array.isArray(data)
        ? data
        : data.items || data.movies || data.channels || data.data || [];
      if (isPaginated && page > 1) {
        setAccumulatedItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id || i.movie_id || i.series_id));
          const filtered = newItems.filter((i) => !existingIds.has(i.id || i.movie_id || i.series_id));
          return [...prev, ...filtered];
        });
      } else if (isPaginated) {
        setAccumulatedItems(newItems);
      }
    }
  }, [data, page, isPaginated]);

  // Auto Pagination scroll listener
  useEffect(() => {
    if (!isPaginated) return;

    const handleScroll = () => {
      if (isFetching || isLoading) return;
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 600) {
        setPage((prevPage) => prevPage + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isPaginated, isFetching, isLoading]);

  const getTitle = () => {
    switch (category) {
      case 'movies':
        return 'All Movies';
      case 'series':
        return 'All Web Series';
      case 'network':
        return `Network Content`;
      case 'genre':
        return `Genre: ${decodeURIComponent(id || '')}`;
      case 'livetv':
        return 'All Live TV Channels';
      default:
        return 'Media Library';
    }
  };

  const isLiveTv = category === 'livetv';

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
                  Live TV: {activeLiveTvPlayer.name || activeLiveTvPlayer.title}
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
                poster={activeLiveTvPlayer.banner || activeLiveTvPlayer.image || activeLiveTvPlayer.poster}
                title={activeLiveTvPlayer.name || activeLiveTvPlayer.title}
                mediaId={`livetv_${activeLiveTvPlayer.id}`}
                mediaType="livetv"
              />
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated text-gray-300 hover:text-white border border-white/10 text-xs font-semibold transition"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        {isPaginated && (
          <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5">
            <Sparkles size={14} />
            Page {page} ({accumulatedItems.length} items loaded)
          </span>
        )}
      </div>

      <div className="border-b border-white/10 pb-4">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
          {category === 'series' ? (
            <Tv size={24} className="text-purple-400" />
          ) : isLiveTv ? (
            <Tv size={24} className="text-red-400" />
          ) : (
            <Film size={24} className="text-blue-400" />
          )}
          {getTitle()}
        </h1>
        <p className="text-xs text-gray-400 mt-1">Browse all available titles with instant playback</p>
      </div>

      {isLoading && page === 1 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
            <CardSkeleton key={n} />
          ))}
        </div>
      ) : isError && displayItems.length === 0 ? (
        <ErrorState onRetry={refetch} message="Could not load media items." />
      ) : displayItems.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="text-sm font-semibold">No media items found for this selection.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayItems.map((item, idx) => {
              if (isLiveTv) {
                return (
                  <div
                    key={item.id || idx}
                    onClick={() => {
                      if (item.url) setActiveLiveTvPlayer(item);
                    }}
                    className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-surface border border-white/10 hover:border-red-500/50 cursor-pointer group shadow-lg transition-transform hover:-translate-y-1"
                  >
                    <img
                      src={item.banner || item.poster || item.poster_path || item.miniposter || item.image || item.stream_icon}
                      alt={item.title || item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-extrabold shadow animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      LIVE
                    </div>

                    <div className="absolute bottom-2 left-2 right-2 text-left">
                      <p className="text-xs font-bold text-white truncate">{item.title || item.name}</p>
                    </div>
                  </div>
                );
              }

              // Normal Movies / Series / Network / Genre cards matching homepage style
              const targetLink = getIStreamLink(item, category === 'series' ? 'series' : 'movie');
              const badge = item.custom_tag?.custom_tags_name || item.custom_tags_name || item.quality;

              return (
                <MediaCard
                  key={item.id || idx}
                  {...item}
                  type={category === 'series' ? 'series' : 'movie'}
                  targetLink={targetLink}
                  badge={badge}
                />
              );
            })}
          </div>

          {/* Auto Pagination Spinner */}
          {isFetching && (
            <div className="flex items-center justify-center gap-2 py-8 text-blue-400 font-semibold text-xs">
              <Loader2 size={20} className="animate-spin" />
              <span>Loading more titles...</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IStreamViewAll;
