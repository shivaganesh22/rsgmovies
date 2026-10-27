const WATCH_HISTORY_KEY = 'rsg_watch_history';
const MAX_HISTORY_ITEMS = 30;

/**
 * Returns list of recently watched media items from localStorage, sorted by updated_at (newest first).
 */
export const getWatchHistory = () => {
  try {
    const raw = localStorage.getItem(WATCH_HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.warn('Error reading watch history:', e);
    return [];
  }
};

/**
 * Saves current playback progress into local watch history.
 */
export const saveWatchProgress = ({
  id,
  title,
  name,
  type = 'movie',
  poster_path,
  poster,
  backdrop_path,
  still_path,
  currentTime = 0,
  duration = 0,
  season_number,
  episode_number,
  episode_name,
  genre,
  genresname,
  rating,
  vote_average,
  year,
  release_date,
  link,
  server,
  videoId,
}) => {
  if (!id || currentTime < 5 || !duration || duration <= 0) return;

  try {
    const history = getWatchHistory();
    const resolvedTitle = title || name || episode_name || 'Untitled';
    const progress = Math.min(100, Math.max(0, (currentTime / duration) * 100));

    // If progress is >= 95% or within last 15s, remove from continue watching (completed)
    if (progress >= 95 || currentTime >= duration - 15) {
      removeFromWatchHistory(id, season_number, episode_number);
      return;
    }

    const itemKey = `${type}_${id}${season_number ? `_s${season_number}e${episode_number}` : ''}`;

    const entry = {
      key: itemKey,
      id,
      title: resolvedTitle,
      name: resolvedTitle,
      type,
      poster_path: poster_path || poster,
      backdrop_path: backdrop_path || still_path || poster_path || poster,
      still_path,
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      progress: Math.round(progress),
      season_number,
      episode_number,
      episode_name,
      genre: genresname || genre || '',
      rating: Number(vote_average || rating || 0),
      year: year || (release_date ? String(release_date).substring(0, 4) : ''),
      link,
      server,
      videoId,
      updated_at: Date.now(),
    };

    // Remove duplicates
    const filtered = history.filter((it) => it.key !== itemKey && it.id !== id);
    filtered.unshift(entry);

    localStorage.setItem(
      WATCH_HISTORY_KEY,
      JSON.stringify(filtered.slice(0, MAX_HISTORY_ITEMS))
    );
  } catch (e) {
    console.warn('Error saving watch history:', e);
  }
};

/**
 * Gets a specific item from watch history by id (and season/episode if series).
 */
export const getWatchItem = (id, season_number, episode_number) => {
  try {
    const history = getWatchHistory();
    const itemKey = season_number ? `series_${id}_s${season_number}e${episode_number}` : null;
    return history.find((it) => {
      if (itemKey && it.key === itemKey) return true;
      if (!itemKey && String(it.id) === String(id)) return true;
      return false;
    }) || null;
  } catch (e) {
    return null;
  }
};

/**
 * Removes a specific item or episode from watch history.
 */
export const removeFromWatchHistory = (id, season_number, episode_number) => {
  try {
    const history = getWatchHistory();
    const itemKey = season_number ? `series_${id}_s${season_number}e${episode_number}` : null;
    const filtered = history.filter((it) => {
      if (itemKey && it.key === itemKey) return false;
      if (!itemKey && String(it.id) === String(id)) return false;
      return true;
    });
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Error removing watch history item:', e);
  }
};

/**
 * Clears entire watch history.
 */
export const clearWatchHistory = () => {
  try {
    localStorage.removeItem(WATCH_HISTORY_KEY);
  } catch (e) {
    console.warn('Error clearing watch history:', e);
  }
};

export default {
  getWatchHistory,
  saveWatchProgress,
  removeFromWatchHistory,
  clearWatchHistory,
};
