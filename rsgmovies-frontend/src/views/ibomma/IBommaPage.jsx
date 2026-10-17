import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import scrapersApi from '../../api/scrapers';
import ErrorState from '../../components/ui/ErrorState';

export const IBommaPage = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ibomma'],
    queryFn: () => scrapersApi.getIbomma(),
  });

  const movies = data?.movies || [];

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-3xl font-black font-display text-white tracking-tight">
          IBomma Telugu Movies
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Telugu movies and direct streams from IBomma.
        </p>
      </div>

      {isError ? (
        <ErrorState onRetry={refetch} message="Could not load IBomma feed." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {isLoading
            ? Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-surface rounded-xl animate-pulse border border-white/5" />
              ))
            : movies.map((m, idx) => (
                <Link
                  key={idx}
                  to={`/ibomma/movie?link=${encodeURIComponent(m.link)}`}
                  state={{ movieData: m }}
                  className="group rounded-xl overflow-hidden glass-panel border border-white/5 hover:border-blue-500/40 p-2 flex flex-col transition hover:-translate-y-1"
                >
                  <div className="aspect-[2/3] w-full rounded-lg overflow-hidden bg-surface mb-2">
                    <img
                      src={m.image}
                      alt={m.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                      loading="lazy"
                    />
                  </div>
                  <h4 className="text-xs font-semibold text-white truncate group-hover:text-blue-400">
                    {m.name}
                  </h4>
                </Link>
              ))}
        </div>
      )}
    </div>
  );
};

export default IBommaPage;
