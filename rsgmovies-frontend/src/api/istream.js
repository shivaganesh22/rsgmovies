import apiClient from './client';

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
    return `/react/istream/manifest/?id=${videoId}`;
  },

  getM3uUrl(videoId) {
    return `/react/istream/playlist.m3u?id=${videoId}`;
  },
};

export default istreamApi;
