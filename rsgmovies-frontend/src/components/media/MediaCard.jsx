import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Play, Film, Tv } from 'lucide-react';

export const MediaCard = (props) => {
  const item = props?.item || {};
  const {
    id = item.id,
    title = item.title,
    name = item.name,
    original_name = item.original_name,
    poster_path = item.poster_path,
    poster = item.poster,
    image = item.image,
    still_path = item.still_path,
    still_path_tv = item.still_path_tv,
    backdrop_path = item.backdrop_path,
    backdrop_path_tv = item.backdrop_path_tv,
    vote_average = item.vote_average,
    rating = item.rating,
    release_date = item.release_date,
    first_air_date = item.first_air_date,
    year = item.year,
    created_at = item.created_at,
    updated_at = item.updated_at,
    subtitle = item.subtitle,
    quality = item.quality,
    genre = item.genre,
    genre_name = item.genre_name,
    genres = item.genres,
    genreslist = item.genreslist,
    genresname = item.genresname,
    release_year = item.release_year,
    newEpisodes = item.newEpisodes,
    type = item.type || 'movie',
    href = item.href,
    serieTmdb = item.serieTmdb,
    season_number = item.season_number,
    episode_number = item.episode_number,
    episode_name = item.episode_name,
    aspectRatio = item.aspectRatio,
  } = props;

  const [imgError, setImgError] = useState(false);

  const rawTitle = title || name || original_name || episode_name || item.title || item.name || 'Untitled';
  const displayTitle = typeof rawTitle === 'object' ? (rawTitle?.title || rawTitle?.name || 'Untitled') : String(rawTitle || 'Untitled');

  // Robust Genre Extraction supporting Blast genresname, genres array, genre_name, and string
  let displayGenre = '';
  const rawGenre = genresname || genre || genre_name || genreslist || genres;
  if (Array.isArray(rawGenre) && rawGenre.length > 0) {
    const first = rawGenre[0];
    displayGenre = typeof first === 'object' ? (first?.name || first?.title || '') : String(first);
  } else if (typeof rawGenre === 'object' && rawGenre !== null) {
    displayGenre = rawGenre.name || rawGenre.title || '';
  } else if (typeof rawGenre === 'string' && rawGenre.trim()) {
    displayGenre = rawGenre.split(',')[0].trim();
  }

  const rawSubtitle =
    props.badge ||
    item.badge ||
    item.custom_tags_name ||
    (typeof item.custom_tag === 'object' ? item.custom_tag?.custom_tags_name : item.custom_tag) ||
    subtitle ||
    quality;
  const displaySubtitle = typeof rawSubtitle === 'object' ? (rawSubtitle?.name || rawSubtitle?.custom_tags_name || '') : (rawSubtitle ? String(rawSubtitle) : '');

  const rawEpisodeName = episode_name;
  const displayEpisodeName = typeof rawEpisodeName === 'object' ? (rawEpisodeName?.name || '') : (rawEpisodeName ? String(rawEpisodeName) : '');

  const isEpisode =
    type === 'episode' ||
    Boolean(season_number || episode_number || still_path || still_path_tv || episode_name);

  let displayPoster = isEpisode
    ? (still_path || still_path_tv || backdrop_path || backdrop_path_tv || poster_path || poster || image)
    : (poster_path || poster || image || backdrop_path || still_path || still_path_tv || backdrop_path_tv);

  if (displayPoster && typeof displayPoster === 'string' && displayPoster.startsWith('http://')) {
    displayPoster = displayPoster.replace('http://', 'https://');
  }

  const numRating = Number(vote_average || rating || 0);
  const rawDate = release_date || first_air_date || year || release_year || (Array.isArray(genres) && genres[0]?.created_at) || created_at || updated_at || '';
  const displayYear = rawDate ? String(rawDate).trim().substring(0, 4) : '';

  const typeStr = String(type || '').toLowerCase();
  const isSeries =
    isEpisode ||
    typeStr === 'series' ||
    typeStr === 'serie' ||
    typeStr === 'tv' ||
    typeStr === 'anime' ||
    (typeof newEpisodes === 'number' ? newEpisodes > 0 : Boolean(newEpisodes));

  const resolvedId = id || serieTmdb;
  const targetLink = props.targetLink || item.targetLink || href || item.href || (isSeries ? `/series/${resolvedId}` : `/movies/${resolvedId}`);

  const episodeBadge =
    (season_number || episode_number)
      ? `S${season_number || 1}E${episode_number || 1}`
      : null;

  const is4by3 = aspectRatio === '4:3' || (isEpisode && !poster_path);
  const ratioClass = is4by3 ? 'aspect-[4/3]' : 'aspect-[2/3]';

  return (
    <Link
      to={targetLink}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-surface-card border border-white/5 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
    >
      {/* Poster Image Container */}
      <div className={`relative ${ratioClass} w-full overflow-hidden bg-surface`}>
        {displayPoster && !imgError ? (
          <img
            src={displayPoster}
            alt={displayTitle}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-gray-500 text-center">
            {isSeries ? <Tv size={30} /> : <Film size={30} />}
            <span className="text-[11px] mt-1.5 font-medium line-clamp-1">{displayTitle}</span>
          </div>
        )}

        {/* Top Left Badges (Episode S1E1, New, Subtitle) */}
        <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap pointer-events-none">
          {Boolean(episodeBadge) && (
            <span className="px-2 py-0.5 text-[10px] font-black rounded-lg bg-black/85 text-white border border-white/15 shadow-md">
              {episodeBadge}
            </span>
          )}
          {Boolean(newEpisodes && Number(newEpisodes) > 0) && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-600 text-white shadow">
              New
            </span>
          )}
          {Boolean(displaySubtitle) && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-600 text-white shadow">
              {displaySubtitle}
            </span>
          )}
        </div>

        {/* Top Right Rating Badge */}
        {numRating > 0 && (
          <div className="absolute top-2 right-2 pointer-events-none">
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-lg bg-black/80 text-amber-400 backdrop-blur-sm border border-amber-400/20 shadow-md">
              <Star size={9} className="fill-amber-400 text-amber-400" />
              {numRating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Hover Overlay Play Icon */}
        <div className="absolute inset-0 bg-gradient-to-t from-darkbg via-darkbg/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/50 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play size={18} className="fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info Card Body */}
      <div className="p-2.5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
            {displayTitle}
          </h4>
          {displayEpisodeName && displayTitle !== displayEpisodeName && (
            <p className="text-[10px] text-gray-400 truncate mt-0.5">
              {displayEpisodeName}
            </p>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between text-[10px] sm:text-[11px] text-gray-400">
          <span className="truncate max-w-[65%]">
            {displayGenre || (isSeries ? 'Series' : 'Movie')}
          </span>
          {Boolean(displayYear) && (
            <span className="font-semibold text-gray-300 text-[10px] sm:text-[11px]">{displayYear}</span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default MediaCard;
