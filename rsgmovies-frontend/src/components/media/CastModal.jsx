import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Star, Film, Sparkles } from 'lucide-react';
import blastApi from '../../api/blast';
import Modal from '../ui/Modal';
import { MediaCardSkeleton } from '../ui/Skeleton';

export const CastModal = ({ isOpen, onClose, castMember }) => {
  const navigate = useNavigate();

  const castId = castMember?.id;

  const { data: filmographyData, isLoading } = useQuery({
    queryKey: ['blastCastFilmography', castId],
    queryFn: () => blastApi.getCastFilmography(castId),
    enabled: Boolean(isOpen && castId),
    staleTime: 1000 * 60 * 30,
  });

  if (!isOpen || !castMember) return null;

  const items = Array.isArray(filmographyData)
    ? filmographyData
    : filmographyData?.data || filmographyData?.movies || [];

  const handleMediaClick = (item) => {
    onClose();
    const typeStr = String(item?.type || '').toLowerCase();
    if (typeStr === 'serie' || typeStr === 'series' || typeStr === 'tv') {
      navigate(`/series/${item.id}`);
    } else {
      navigate(`/movies/${item.id}`);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl lg:max-w-4xl" title="">
      <div className="space-y-4 p-1 sm:p-2">
        {/* Cast Profile Header */}
        <div className="flex items-center gap-4 border-b border-white/10 pb-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-surface-elevated border-2 border-blue-500/40 shadow-xl flex-shrink-0">
            {castMember.profile_path ? (
              <img
                src={
                  castMember.profile_path.startsWith('http://')
                    ? castMember.profile_path.replace('http://', 'https://')
                    : castMember.profile_path
                }
                alt={castMember.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-2xl font-bold">
                {castMember.name?.charAt(0)}
              </div>
            )}
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-blue-400" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                Cast Profile
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white truncate">
              {castMember.name}
            </h2>
            {castMember.character && (
              <p className="text-xs text-gray-400 truncate">
                as <span className="text-gray-200 font-medium">{castMember.character}</span>
              </p>
            )}
          </div>
        </div>

        {/* Filmography Section - Movies & Series from Blast */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Film size={15} className="text-blue-400" />
            <span>Related Movies & Series ({items.length})</span>
          </h3>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[55vh] overflow-y-auto pr-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <MediaCardSkeleton key={i} />
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[55vh] overflow-y-auto pr-2 no-scrollbar">
              {items.map((item) => {
                let posterUrl = item.poster_path || item.backdrop_path;
                if (posterUrl && typeof posterUrl === 'string' && posterUrl.startsWith('http://')) {
                  posterUrl = posterUrl.replace('http://', 'https://');
                }

                const typeStr = String(item?.type || '').toLowerCase();
                const isSeries = typeStr === 'serie' || typeStr === 'series' || typeStr === 'tv';
                const itemTitle = item.title || item.name || 'Untitled';
                const itemRating = Number(item.vote_average || item.rating || 0);
                const rawDate = item.release_date || item.first_air_date || item.year || item.release_year || (Array.isArray(item.genres) && item.genres[0]?.created_at) || item.created_at || item.updated_at || '';
                const itemYear = rawDate ? String(rawDate).trim().substring(0, 4) : '';

                let itemGenre = '';
                const rawG = item.genresname || item.genre || item.genre_name || item.genreslist || item.genres;
                if (Array.isArray(rawG) && rawG.length > 0) {
                  const first = rawG[0];
                  itemGenre = typeof first === 'object' ? (first?.name || first?.title || '') : String(first);
                } else if (typeof rawG === 'object' && rawG !== null) {
                  itemGenre = rawG.name || rawG.title || '';
                } else if (typeof rawG === 'string' && rawG.trim()) {
                  itemGenre = rawG.split(',')[0].trim();
                }

                return (
                  <div
                    key={item.id}
                    onClick={() => handleMediaClick(item)}
                    className="group relative flex flex-col rounded-xl overflow-hidden bg-surface-elevated border border-white/5 hover:border-blue-500 transition-all duration-200 cursor-pointer shadow hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="aspect-[2/3] w-full overflow-hidden bg-surface relative">
                      <img
                        src={posterUrl || 'https://via.placeholder.com/300x450?text=No+Poster'}
                        alt={itemTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {itemRating > 0 && (
                        <div className="absolute top-1.5 right-1.5 pointer-events-none">
                          <span className="flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-bold rounded bg-black/80 text-amber-400 border border-amber-400/20 shadow">
                            <Star size={8} className="fill-amber-400 text-amber-400" />
                            {itemRating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-2 flex-1 flex flex-col justify-between">
                      <h4 className="text-[11px] font-semibold text-white group-hover:text-blue-400 transition line-clamp-1">
                        {itemTitle}
                      </h4>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400">
                        <span className="truncate max-w-[65%] px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-medium text-[9px]">
                          {itemGenre || (isSeries ? 'Series' : 'Movie')}
                        </span>
                        {itemYear && <span className="font-semibold text-gray-300 text-[10px]">{itemYear}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 text-xs">
              No movies or series found for this person on Blast.
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CastModal;
