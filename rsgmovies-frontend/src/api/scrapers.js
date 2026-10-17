import apiClient from './client';

export const scrapersApi = {
  // Movierulz
  async getMovierulz(category = '') {
    const url = category ? `/react/movierulz/?category=${encodeURIComponent(category)}` : '/react/movierulz/';
    const res = await apiClient.get(url);
    return res.data;
  },

  async getMovierulzMovie(slugOrLink) {
    if (!slugOrLink) return {};
    const cleanSlug = String(slugOrLink).replace(/^\/+/, '').replace(/\.html$/, '');
    const res = await apiClient.get(`/react/movierulz/movie/${encodeURIComponent(cleanSlug)}/`);
    return res.data;
  },

  async getMovierulzSpecial(pathOrId, slug) {
    const path = slug ? `${pathOrId}/${slug}` : String(pathOrId).replace(/^\/+/, '');
    const res = await apiClient.get(`/react/movierulz/special/${path}/`);
    return res.data;
  },

  async searchMovierulz(query) {
    const res = await apiClient.get(`/react/movierulz/search/${encodeURIComponent(query)}/`);
    return res.data;
  },

  // TamilMV
  async getTamilmv() {
    const res = await apiClient.get('/react/tamilmv/');
    return res.data;
  },

  async getTamilmvMovie(link) {
    const res = await apiClient.get(`/react/tamilmv/movie/?link=${encodeURIComponent(link)}`);
    return res.data;
  },

  // Torrents Engine (TorrentDownloads)
  async searchTorrents(query, page = 1) {
    const res = await apiClient.get(`/react/torrents/search/?query=${encodeURIComponent(query)}&page=${page}`);
    return res.data;
  },

  async getTorrentMagnet(link) {
    const res = await apiClient.get(`/react/torrents/magnet/?link=${encodeURIComponent(link)}`);
    return res.data;
  },

  // IBomma
  async getIbomma() {
    const res = await apiClient.get('/react/ibomma/');
    return res.data;
  },

  async getIbommaMovie(link) {
    const res = await apiClient.get(`/react/ibomma/movie/?link=${encodeURIComponent(link)}`);
    return res.data;
  },

  // AllMovies
  async getAllMovies() {
    const res = await apiClient.get('/react/allmovies/');
    return res.data;
  },

  async getImdbTop() {
    const res = await apiClient.get('/react/imdb/');
    return res.data;
  },

  async searchAllMovies(query) {
    const res = await apiClient.get(`/react/allmovies/search/?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  async getAllMoviesMovie(id) {
    const res = await apiClient.get(`/react/allmovies/movies/${id}/`);
    return res.data;
  },

  async getAllMoviesTvShows(id) {
    const res = await apiClient.get(`/react/allmovies/tvshows/${id}/`);
    return res.data;
  },

  async getAllMoviesEpisodes(id) {
    const res = await apiClient.get(`/react/allmovies/episodes/${id}/`);
    return res.data;
  },

  async getAllMoviesPlayer(link) {
    const res = await apiClient.get(`/react/allmovies/player/?link=${encodeURIComponent(link)}`);
    return res.data;
  },

  // Global Torrent Search
  async searchTorrents(query, page = 1) {
    const res = await apiClient.get(`/react/search/?q=${encodeURIComponent(query)}&page=${page}`);
    return res.data;
  },

  // Contact
  async submitContact(data) {
    const res = await apiClient.post('/react/contact/', data);
    return res.data;
  },
};

export default scrapersApi;
