import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Film, Star, Search } from 'lucide-react';
import scrapersApi from '../../api/scrapers';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';

export const AllMoviesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['allmovies', activeSearch],
    queryFn: () => (activeSearch ? scrapersApi.searchAllMovies(activeSearch) : scrapersApi.getAllMovies()),
  });

  const { data: imdbData } = useQuery({
    queryKey: ['allmoviesImdb'],
    queryFn: () => scrapersApi.getImdbTop(),
  });

  const movies = data?.movies || [];
  const topMovies = imdbData?.movies || [];

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveSearch(searchQuery.trim());
  };

  return (
    <div className="space-y-10 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black font-display text-white tracking-tight">
            AllMovies & IMDb Catalog
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Global movies index, IMDb top ranked movies, and multi-server video streams.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm w-full">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search AllMovies..."
            icon={<Search size={16} />}
          />
          <Button variant="secondary" size="md" type="submit">
            Search
          </Button>
        </form>
      </div>

      {/* Top IMDb Carousel / Showcase if available */}
      {topMovies.length > 0 && !activeSearch && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
            <Star size={18} className="text-amber-400 fill-amber-400" />
            Top IMDb Titles
          </h2>
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3">
            {topMovies.map((m, idx) => (
              <div key={idx} className="min-w-[150px] max-w-[170px] flex-shrink-0">
                <Link
                  to={`/allmovies/movies/${m.id || idx}`}
                  state={{ movieData: m }}
                  className="group rounded-xl overflow-hidden glass-panel p-2 flex flex-col border border-white/5 hover:border-blue-500/40 transition"
                >
                  <div className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-surface mb-2">
                    <img
                      src={m.image || m.poster}
                      alt={m.name || m.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                      loading="lazy"
                    />
                  </div>
                  <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400">
                    {m.name || m.title}
                  </h4>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Movies Grid */}
      {isError ? (
        <ErrorState onRetry={refetch} message="Could not load AllMovies catalog." />
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-bold font-display text-white">All Releases</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {isLoading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-[2/3] bg-surface rounded-xl animate-pulse border border-white/5" />
                ))
              : movies.map((m, idx) => (
                  <Link
                    key={idx}
                    to={`/allmovies/movies/${m.id || idx}`}
                    state={{ movieData: m }}
                    className="group rounded-xl overflow-hidden glass-panel border border-white/5 hover:border-blue-500/40 p-2 flex flex-col transition hover:-translate-y-1"
                  >
                    <div className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-surface mb-2">
                      <img
                        src={m.image || m.poster}
                        alt={m.name || m.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                        loading="lazy"
                      />
                    </div>
                    <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400">
                      {m.name || m.title}
                    </h4>
                  </Link>
                ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllMoviesPage;
