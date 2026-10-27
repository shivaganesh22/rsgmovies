import apiClient from './client';

export const blastApi = {
  async getHome() {
    const res = await apiClient.get('/react/blast/home/');
    return res.data;
  },

  async getMovies(page = 1) {
    const res = await apiClient.get(`/react/blast/movies/?page=${page}`);
    return res.data;
  },

  async getMoviesFilter(filter = 'latestadded', page = 1) {
    const res = await apiClient.get(`/react/blast/movies_filter/?filter=${encodeURIComponent(filter)}&page=${page}`);
    return res.data;
  },

  async getMoviesByGenre(genreId, page = 1) {
    const res = await apiClient.get(`/react/blast/movies_genre/${genreId}/?page=${page}`);
    return res.data;
  },

  async getSeries(page = 1) {
    const res = await apiClient.get(`/react/blast/series/?page=${page}`);
    return res.data;
  },

  async getSeriesFilter(filter = 'latestadded', page = 1) {
    const res = await apiClient.get(`/react/blast/series_filter/?filter=${encodeURIComponent(filter)}&page=${page}`);
    return res.data;
  },

  async getSeriesByGenre(genreId, page = 1) {
    const res = await apiClient.get(`/react/blast/series_genre/${genreId}/?page=${page}`);
    return res.data;
  },

  async getMovieDetails(id) {
    const res = await apiClient.get(`/react/blast/movie/${id}/`);
    return res.data;
  },

  async getMovieRelated(id) {
    const res = await apiClient.get(`/react/blast/movie/${id}/related/`);
    return res.data;
  },

  async getSeriesDetails(id) {
    const res = await apiClient.get(`/react/blast/series/${id}/`);
    return res.data;
  },

  async getSeriesRelated(id) {
    const res = await apiClient.get(`/react/blast/series/${id}/related/`);
    return res.data;
  },

  async getCastFilmography(id, page = 1) {
    const res = await apiClient.get(`/react/blast/cast/${id}/?page=${page}`);
    return res.data;
  },

  async getGenres() {
    const res = await apiClient.get('/react/blast/genres/');
    return res.data;
  },

  async search(query) {
    if (!query) return { search: [] };
    const res = await apiClient.get(`/react/blast/search/?query=${encodeURIComponent(query)}`);
    return res.data;
  },

  async getPinned(page = 1) {
    const res = await apiClient.get(`/react/blast/pinned/?page=${page}`);
    return res.data;
  },

  async getRecentlyAdded(page = 1) {
    const res = await apiClient.get(`/react/blast/recently_added/?page=${page}`);
    return res.data;
  },

  async getLatestEpisodes(page = 1) {
    const res = await apiClient.get(`/react/blast/latest_series_episodes/?page=${page}`);
    return res.data;
  },

  async getTrending(page = 1) {
    const res = await apiClient.get(`/react/blast/trending/?page=${page}`);
    return res.data;
  },

  async getRecommended(page = 1) {
    const res = await apiClient.get(`/react/blast/recommended/?page=${page}`);
    return res.data;
  },

  async getChoosed(page = 1) {
    const res = await apiClient.get(`/react/blast/choosed/?page=${page}`);
    return res.data;
  },

  async getNewHd(page = 1) {
    const res = await apiClient.get(`/react/blast/new_hd/?page=${page}`);
    return res.data;
  },

  async getPopularSeries(page = 1) {
    const res = await apiClient.get(`/react/blast/popular_series/?page=${page}`);
    return res.data;
  },

  async getLatestMovies(page = 1) {
    const res = await apiClient.get(`/react/blast/latest_movies/?page=${page}`);
    return res.data;
  },

  async getLatestSeries(page = 1) {
    const res = await apiClient.get(`/react/blast/latest_series/?page=${page}`);
    return res.data;
  },

  async getNextThisWeek(page = 1) {
    const res = await apiClient.get(`/react/blast/next_this_week/?page=${page}`);
    return res.data;
  },

  async getMostPopular(page = 1) {
    const res = await apiClient.get(`/react/blast/most_popular/?page=${page}`);
    return res.data;
  },

  async getCategoryItems(categoryKey, page = 1) {
    switch (categoryKey) {
      case 'pinned':
        return this.getPinned(page);
      case 'recents':
      case 'recently_added':
        return this.getRecentlyAdded(page);
      case 'latest_movies':
        return this.getLatestMovies(page);
      case 'popularSeries':
      case 'popular_series':
        return this.getPopularSeries(page);
      case 'latest':
      case 'latest_series':
        return this.getLatestSeries(page);
      case 'latest_episodes':
      case 'latest_series_episodes':
        return this.getLatestEpisodes(page);
      case 'trending':
        return this.getTrending(page);
      case 'recommended':
        return this.getRecommended(page);
      case 'popular':
      case 'most_popular':
        return this.getMostPopular(page);
      case 'choosed':
        return this.getChoosed(page);
      case 'thisweek':
      case 'next_this_week':
        return this.getNextThisWeek(page);
      case 'new_hd':
        return this.getNewHd(page);
      case 'movies':
        return this.getMovies(page);
      case 'series':
        return this.getSeries(page);
      default:
        return this.getMovies(page);
    }
  }
};

export default blastApi;
