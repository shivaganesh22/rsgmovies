import React from 'react';
import { useParams, useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Film, Sparkles } from 'lucide-react';
import scrapersApi from '../../api/scrapers';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';

export const MovierulzSpecialPage = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Extract path from wildcard params or query param
  const wildcardPath = params['*'] || '';
  const queryPath = searchParams.get('path') || '';
  const targetPath = wildcardPath || queryPath || location.pathname.replace('/movierulz/special/', '');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['movierulzSpecial', targetPath],
    queryFn: () => scrapersApi.getMovierulzSpecial(targetPath),
    enabled: Boolean(targetPath),
  });

  const movies = data?.movies || [];
  const pageTitle = data?.title || targetPath.split('/').pop().replace(/-/g, ' ').toUpperCase() || 'Filtered Movies';

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16 px-2 sm:px-0">
      {/* Back Button & Header */}
      <div className="space-y-4 border-b border-white/10 pb-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-elevated hover:bg-white/10 text-sm font-semibold text-gray-300 hover:text-white border border-white/5 transition"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-2">
            <Sparkles size={13} />
            <span>Category / Filter</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Browse all Movierulz releases associated with this category, genre, or artist.
          </p>
        </div>
      </div>

      {/* Grid Results */}
      {isError ? (
        <ErrorState onRetry={refetch} message="Could not load category releases." />
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] bg-surface rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <EmptyState
          title="No movies found"
          message={`No releases found under "${pageTitle}".`}
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

                  {/* Quality Badge */}
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

export default MovierulzSpecialPage;
