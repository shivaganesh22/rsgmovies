import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Star, Calendar } from 'lucide-react';

// Map frontend section keys to your Django backend endpoints
const API_ENDPOINTS = {
  'pinned': 'blast/pinned/',
  'new-hd': 'blast/new_hd/',
  'recently-added': 'blast/recently_added/',
  'latest-episodes': 'blast/latest_series_episodes/',
  'recommended': 'blast/recommended/',
  'trending': 'blast/trending/',
  'choosed': 'blast/choosed/',
  'popular-series': 'blast/popular_series/',
  'latest-series': 'blast/latest_series/',
  'latest-movies': 'blast/latest_movies/',
  'this-week': 'blast/next_this_week/',
  'popular': 'blast/most_popular/',
};

const SECTION_TITLES = {
  'pinned': 'Pinned Content',
  'new-hd': 'New HD Releases',
  'recently-added': 'Recently Added',
  'latest-episodes': 'Latest Episodes',
  'recommended': 'Recommended For You',
  'trending': 'Trending Now',
  'choosed': 'Choosed For You',
  'popular-series': 'Popular Series',
  'latest-series': 'Latest Series',
  'latest-movies': 'Latest Movies',
  'this-week': 'New This Week',
  'popular': 'Most Popular',
};

export default function ViewAllPage() {
  const { category } = useParams();
  const navigate = useNavigate();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const observer = useRef();
  
  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, [category]);

  useEffect(() => {
    fetchData();
  }, [page, category]);

  const fetchData = async () => {
    const endpoint = API_ENDPOINTS[category];
    if (!endpoint) {
      console.error("Invalid Category:", category);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/${endpoint}?page=${page}`);
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const json = await response.json();
      const newItems = json.data || [];

      setItems(prev => {
        const existingIds = new Set(prev.map(i => i.id));
        const uniqueNewItems = newItems.filter(i => !existingIds.has(i.id));
        return [...prev, ...uniqueNewItems];
      });

      if (json.current_page && json.last_page) {
        setHasMore(json.current_page < json.last_page);
      } else {
        setHasMore(newItems.length > 0);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
      if (page > 1) setHasMore(false); 
    }
  };

  const handleNavigate = (item) => {
    if (category === 'latest-episodes' || item.type === 'episode') {
      navigate(`/series/${item.id}`);
    } else {
      navigate(`/${item.type.toLowerCase()  === 'serie' ? 'series' : 'movie'}/${item.id}`);
    }
  };

  const isEpisodeView = category === 'latest-episodes';

  // Card Components (Internal for cleaner loop)
  const MovieCard = ({ item, innerRef }) => (
    <div 
      ref={innerRef}
      onClick={() => handleNavigate(item)}
      className="group cursor-pointer flex flex-col"
    >
      <div className="relative rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gray-200 dark:bg-slate-700 aspect-[2/3]">
        <img 
          src={item.poster_path || item.still_path || item.image} 
          alt={item.name || item.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity duration-300 opacity-0 group-hover:opacity-100">
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-8 md:w-10 h-8 md:h-10 text-white" />
          </div>
        </div>

        {item.quality && (
          <div className="absolute top-1 right-1 md:top-2 md:right-2 bg-yellow-500 text-black text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg uppercase">
            {item.quality}
          </div>
        )}

        {item.subtitle && (
          <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-green-500 text-white text-[9px] md:text-[10px] px-1.5 py-0.5 rounded font-semibold shadow-lg uppercase">
            {item.subtitle}
          </div>
        )}

        {item.newEpisodes > 0 && (
          <div className="absolute bottom-1 left-1 right-1 md:bottom-2 md:left-2 md:right-2 bg-red-600 text-white text-[9px] md:text-[10px] py-0.5 md:py-1 text-center font-bold uppercase tracking-wide rounded">
            New Episodes
          </div>
        )}

        {item.season_number && item.episode_number && !isEpisodeView && (
          <div className="absolute top-1 left-1 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold">
            S{item.season_number}E{item.episode_number}
          </div>
        )}
      </div>

      <div className="mt-2 px-0.5">
        <h3 className="text-xs md:text-sm font-semibold line-clamp-1 transition-colors text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-500">
          {item.title || item.name}
          {item.episode_name && `: ${item.episode_name}`}
        </h3>
        <p className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400 mt-0.5">
          {item.release_date ? new Date(item.release_date).getFullYear() : ''}
        </p>
      </div>
    </div>
  );

  const EpisodeCard = ({ item, innerRef }) => (
    <div 
      ref={innerRef}
      onClick={() => handleNavigate(item)}
      className="group cursor-pointer flex flex-col"
    >
      <div className="relative rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gray-200 dark:bg-slate-700 aspect-video">
        <img 
          src={item.still_path || item.poster_path} 
          alt={item.name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity duration-300 opacity-0 group-hover:opacity-100">
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="absolute top-2 left-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded font-semibold">
          {item.season_number ? `S${item.season_number}E${item.episode_number}` : `EP ${item.episode_number}`}
        </div>
      </div>

      <div className="mt-2 px-1">
        <h3 className="text-xs md:text-sm font-semibold line-clamp-1 transition-colors text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-500">
          {item.name}
          {item.episode_name ? `: ${item.episode_name}` : ''}
        </h3>
      </div>
    </div>
  );

  return (
    // Reduced padding-top (pt-20 -> pt-16) to remove blank space
    <main className="min-h-screen bg-gray-50 dark:bg-[#1E293B] pb-8">
      
      {/* Header - Removed back button, reduced margin */}
      <div className="max-w-7xl mx-auto mb-4">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
          {SECTION_TITLES[category] || 'Content'}
        </h1>
      </div>

      {/* Grid Content */}
      <div className={`max-w-7xl mx-auto grid ${
        isEpisodeView 
          // Episodes: 2 columns on mobile
          ? 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4' 
          // Movies: 3 columns on mobile
          : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-4'
      }`}>
        {items.map((item, index) => {
          const isLastElement = items.length === index + 1;
          
          return isEpisodeView ? (
            <EpisodeCard 
              key={`${item.id}-${index}`} 
              item={item} 
              innerRef={isLastElement ? lastElementRef : null} 
            />
          ) : (
            <MovieCard 
              key={`${item.id}-${index}`} 
              item={item} 
              innerRef={isLastElement ? lastElementRef : null} 
            />
          );
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600"></div>
        </div>
      )}

      {/* End of results */}
      {/* {!hasMore && items.length > 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-slate-400">
          You've reached the end of the list.
        </div>
      )} */}
    </main>
  );
}