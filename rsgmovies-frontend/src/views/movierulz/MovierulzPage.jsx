import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Film, Sparkles } from 'lucide-react';
import scrapersApi from '../../api/scrapers';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';

const CATEGORIES = [
  { id: '', label: 'All Releases' },
  { id: 'telugu-movies', label: 'Telugu' },
  { id: 'tamil-movies', label: 'Tamil' },
  { id: 'bollywood-movies-page', label: 'Hindi' },
  { id: 'malayalam-movies-page', label: 'Malayalam' },
  { id: 'hollywood-movies-page', label: 'English' },
];

export const MovierulzPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['movierulz', activeSearch, activeCategory],
    queryFn: () => {
      if (activeSearch) {
        return scrapersApi.searchMovierulz(activeSearch);
      }
      return scrapersApi.getMovierulz(activeCategory);
    },
  });

  const movies = data?.movies || [];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveCategory('');
      setActiveSearch(searchQuery.trim());
    } else {
      setActiveSearch('');
    }
  };

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    setActiveSearch('');
    setSearchQuery('');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-2">
            <Sparkles size={13} />
            <span>Direct Web Scraper Feed</span>
          </div>
          <h1 className="text-3xl font-black font-display text-white tracking-tight">
            Movierulz Releases
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Browse verified Telugu, Tamil, Hindi, and Malayalam releases with live quality tags & magnet links.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm w-full">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Movierulz..."
            icon={<Search size={16} />}
          />
          <Button variant="primary" size="md" type="submit">
            Search
          </Button>
        </form>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeCategory === cat.id && !activeSearch
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-surface-elevated hover:bg-white/10 text-gray-300 border border-white/5'
            }`}
          >
            <Film size={13} />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Grid Results */}
      {isError ? (
        <ErrorState onRetry={refetch} message="Could not fetch Movierulz movies. Mirror domains may be rotating." />
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-surface rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <EmptyState
          title="No movies found"
          message={activeSearch ? `No Movierulz releases matching "${activeSearch}".` : 'No movies found in this category.'}
          icon={<Film size={32} />}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {movies.map((item, idx) => {
            const isCamOrDvdScr = ['CAM', 'DVDSCR', 'PREDVD', 'HDTS'].includes((item.quality || '').toUpperCase());
            const isHighQuality = ['HDRIP', 'WEB-DL', 'BLURAY', 'BRRIP'].includes((item.quality || '').toUpperCase());
            const cleanSlug = (item.link || '').replace(/^\/+/, '').replace(/\.html$/, '') || `movie-${idx}`;

            return (
              <Link
                key={idx}
                to={`/movierulz/movie/${encodeURIComponent(cleanSlug)}`}
                className="group relative rounded-2xl overflow-hidden glass-panel border border-white/5 hover:border-blue-500/40 p-2.5 flex flex-col transition hover:-translate-y-1.5 duration-200 shadow hover:shadow-xl"
              >
                <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-surface mb-2.5 relative">
                  <img
                    src={item.image || 'https://via.placeholder.com/300x450?text=Movierulz'}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/300x450?text=No+Poster';
                    }}
                  />

                  {/* Dynamic Accurate Quality Badge */}
                  <div
                    className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wider uppercase backdrop-blur-md shadow ${
                      isCamOrDvdScr
                        ? 'bg-amber-500/80 text-white border border-amber-400/50'
                        : isHighQuality
                        ? 'bg-emerald-600/80 text-white border border-emerald-400/50'
                        : 'bg-black/70 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {item.quality || 'HD'}
                  </div>

                  {/* Language Pill */}
                  {item.language && (
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[9px] font-bold text-gray-200 border border-white/10">
                      {item.language}
                    </div>
                  )}
                </div>

                <h4 className="text-xs font-bold text-white line-clamp-2 group-hover:text-blue-400 leading-snug">
                  {item.clean_name || item.name}
                </h4>

                {item.year && (
                  <span className="text-[10px] text-gray-400 mt-1 font-medium">
                    {item.year}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MovierulzPage;
