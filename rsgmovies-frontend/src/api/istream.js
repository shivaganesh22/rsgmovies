import apiClient from './client';

export const ISTREAM_VPS_PROXY = import.meta.env.VITE_ISTREAM_PROXY_URL || import.meta.env.VITE_MOVIEBOX_PROXY_URL || 'http://129.225.111.76:5000';

export const encodeHeaders = (headersObj) => {
  if (!headersObj) return '';
  try {
    const jsonStr = JSON.stringify(headersObj);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    return '';
  }
};

export const resolveIStreamSourceUrl = (videoId) => {
  if (!videoId) return '';
  let raw = String(videoId).trim();
  if (raw.includes('id=http')) {
    raw = decodeURIComponent(raw.split('id=')[1].split('&')[0]);
  } else if (raw.includes('url=http')) {
    raw = decodeURIComponent(raw.split('url=')[1].split('&')[0]);
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  const cleanId = raw.replace('istream_', '').trim();
  return `http://exposeworld.art/oxx/ox.php?id=${cleanId}`;
};

export const getIStreamVpsProxyUrl = (videoId, proxyBase = ISTREAM_VPS_PROXY) => {
  const sourceUrl = resolveIStreamSourceUrl(videoId);
  if (!sourceUrl) return '';
  const base = (proxyBase || ISTREAM_VPS_PROXY).replace(/\/+$/, '');
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Cookie': 'tstc=p',
  };
  const h = encodeHeaders(headers);
  return `${base}/stream?url=${encodeURIComponent(sourceUrl)}&h=${h}`;
};

export const istreamApi = {
  async getHomeSlider() {
    const res = await apiClient.get('/react/istream/home_slider/');
    return res.data;
  },

  async getNetworks() {
    const res = await apiClient.get('/react/istream/networks/');
    return res.data;
  },

  async getNetworkContent(id) {
    const res = await apiClient.get(`/react/istream/network/${id}/`);
    return res.data;
  },

  async getLiveTvGenres() {
    const res = await apiClient.get('/react/istream/live_tv_genres/');
    return res.data;
  },

  async getLiveTvByGenre(genre) {
    const res = await apiClient.get(`/react/istream/live_tv/genre/${encodeURIComponent(genre)}/`);
    return res.data;
  },

  async getLiveTvDetails(id) {
    const res = await apiClient.get(`/react/istream/live_tv/details/${id}/`);
    return res.data;
  },

  async getFeaturedLiveTv() {
    const res = await apiClient.get('/react/istream/live_tv/featured/');
    return res.data;
  },

  async getAllLiveTv() {
    const res = await apiClient.get('/react/istream/live_tv/all/');
    return res.data;
  },

  async getTrending() {
    const res = await apiClient.get('/react/istream/trending/');
    return res.data;
  },

  async getMostWatchedMovies() {
    const res = await apiClient.get('/react/istream/most_watched/movies/');
    return res.data;
  },

  async getMostWatchedSeries() {
    const res = await apiClient.get('/react/istream/most_watched/series/');
    return res.data;
  },

  async getBecauseWatchedMovies(id) {
    const res = await apiClient.get(`/react/istream/because_watched/movie/${id}/`);
    return res.data;
  },

  async getBecauseWatchedSeries(id) {
    const res = await apiClient.get(`/react/istream/because_watched/series/${id}/`);
    return res.data;
  },

  async getRecentMovies() {
    const res = await apiClient.get('/react/istream/recent/movies/');
    return res.data;
  },

  async getRecentSeries() {
    const res = await apiClient.get('/react/istream/recent/series/');
    return res.data;
  },

  async getMostSearched() {
    const res = await apiClient.get('/react/istream/most_searched/');
    return res.data;
  },

  async getGenres() {
    const res = await apiClient.get('/react/istream/genres/');
    return res.data;
  },

  async getContentsByGenre(genre) {
    const res = await apiClient.get(`/react/istream/genre/${encodeURIComponent(genre)}/`);
    return res.data;
  },

  async getRandMovies() {
    const res = await apiClient.get('/react/istream/rand/movies/');
    return res.data;
  },

  async getRandSeries() {
    const res = await apiClient.get('/react/istream/rand/series/');
    return res.data;
  },

  async getAllMovies(page = 1) {
    const res = await apiClient.get(`/react/istream/all/movies/${page}/`);
    return res.data;
  },

  async getAllSeries(page = 1) {
    const res = await apiClient.get(`/react/istream/all/series/${page}/`);
    return res.data;
  },

  async getMovieDetails(id) {
    const res = await apiClient.get(`/react/istream/movie/${id}/`);
    return res.data;
  },

  async getMoviePlayLinks(id) {
    const res = await apiClient.get(`/react/istream/movie/${id}/links/`);
    return res.data;
  },

  async getSeriesDetails(id) {
    const res = await apiClient.get(`/react/istream/series/${id}/`);
    return res.data;
  },

  async getSeriesSeasons(id) {
    const res = await apiClient.get(`/react/istream/series/${id}/seasons/`);
    return res.data;
  },

  async getSeriesEpisodes(seasonId) {
    const res = await apiClient.get(`/react/istream/series/episodes/${seasonId}/`);
    return res.data;
  },

  async getRelatedMovies(id) {
    const res = await apiClient.get(`/react/istream/movie/${id}/related/`);
    return res.data;
  },

  async getRelatedSeries(id) {
    const res = await apiClient.get(`/react/istream/series/${id}/related/`);
    return res.data;
  },

  async search(query, page = 1) {
    if (!query) return [];
    const res = await apiClient.get(`/react/istream/search/?query=${encodeURIComponent(query)}&page=${page}`);
    return res.data;
  },

  getManifestUrl(videoId) {
    return getIStreamVpsProxyUrl(videoId);
  },

  getM3uUrl(videoId) {
    const vps = (ISTREAM_VPS_PROXY || 'http://129.225.111.76:5000').replace(/\/+$/, '');
    return `${vps}/istream/playlist.m3u?id=${videoId}`;
  },
};

export default istreamApi;
