import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, X, Star, Film, Tv, Clock } from 'lucide-react';
import { removeFromWatchHistory } from '../../utils/watchHistory';

export const ContinueWatchingCard = ({ item, onRemove }) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  if (!item) return null;

  const {
    id,
    title,
    name,
    type = 'movie',
    poster_path,
    backdrop_path,
    still_path,
    currentTime = 0,
    duration = 0,
    progress = 0,
    season_number,
    episode_number,
    episode_name,
    genre,
    rating = 0,
    year,
  } = item;

  const isSeries = type === 'series' || type === 'serie' || Boolean(season_number);
  const displayTitle = title || name || 'Untitled';
  const rawPoster = backdrop_path || still_path || poster_path;
  let displayImage = rawPoster;
  if (displayImage && typeof displayImage === 'string' && displayImage.startsWith('http://')) {
    displayImage = displayImage.replace('http://', 'https://');
  }

  // Calculate remaining time
  const remainingSeconds = Math.max(0, duration - currentTime);
  const remainingMinutes = Math.max(1, Math.round(remainingSeconds / 60));
  const remainingText =
    remainingMinutes >= 60
      ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m left`
      : `${remainingMinutes}m left`;

  const episodeBadge = season_number && episode_number ? `S${season_number}:E${episode_number}` : null;

  const handleCardClick = () => {
    const params = new URLSearchParams();
    if (currentTime > 0) params.set('time', String(currentTime));
    if (item.videoId) params.set('videoId', String(item.videoId));
    if (item.server) params.set('server', String(item.server));
    params.set('play', 'true');

    if (isSeries) {
      params.set('season', String(season_number || 1));
      params.set('episode', String(episode_number || 1));
      navigate(`/series/${id}?${params.toString()}`);
    } else {
      navigate(`/movies/${id}?${params.toString()}`);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    removeFromWatchHistory(id, season_number, episode_number);
    onRemove?.(item);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex-shrink-0 w-64 sm:w-72 md:w-80 cursor-pointer rounded-2xl overflow-hidden bg-surface-card border border-white/10 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1"
    >
      {/* 16:9 Aspect Ratio Media Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-surface">
        {displayImage && !imgError ? (
          <img
            src={displayImage}
            alt={displayTitle}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-gray-500 bg-surface-elevated">
            {isSeries ? <Tv size={28} /> : <Film size={28} />}
            <span className="text-xs mt-1 font-medium truncate max-w-[85%]">{displayTitle}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
          {episodeBadge && (
            <span className="px-2 py-0.5 text-[10px] font-black rounded-md bg-black/85 text-blue-400 border border-blue-500/30 shadow">
              {episodeBadge}
            </span>
          )}
          {rating > 0 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-black/80 text-amber-400 border border-amber-400/20 shadow">
              <Star size={8} className="fill-amber-400 text-amber-400" />
              {Number(rating).toFixed(1)}
            </span>
          )}
        </div>

        {/* Remove Button (Top Right) */}
        <button
          onClick={handleRemove}
          className="absolute top-2 right-2 p-1 rounded-full bg-black/70 hover:bg-red-600/90 text-gray-300 hover:text-white transition shadow-md z-10 opacity-80 group-hover:opacity-100"
          title="Remove from Continue Watching"
          aria-label="Remove"
        >
          <X size={13} />
        </button>

        {/* Play Icon Center Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/50 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play size={20} className="fill-current ml-0.5" />
          </div>
        </div>

        {/* Bottom Progress Bar Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-900/90">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-r-full transition-all duration-300"
            style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
          />
        </div>
      </div>

      {/* Info Body */}
      <div className="p-3 bg-surface-card/95 flex flex-col justify-between">
        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
            {displayTitle}
          </h4>
          {episode_name && displayTitle !== episode_name && (
            <p className="text-[10px] text-gray-400 truncate mt-0.5">
              {episode_name}
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400 border-t border-white/5 pt-1.5">
          <span className="truncate max-w-[55%] text-[10px] text-gray-400">
            {genre || (isSeries ? 'Series' : 'Movie')}
          </span>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-300">
            <Clock size={11} className="text-blue-400" />
            <span>{remainingText}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContinueWatchingCard;
