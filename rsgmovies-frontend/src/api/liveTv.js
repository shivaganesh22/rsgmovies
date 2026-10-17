import apiClient from './client';

export const liveTvApi = {
  /**
   * Fetches Live TV channels, categories, and totals.
   * Supports optional category filtering and search query.
   */
  async getChannels({ category = '', search = '', refresh = false } = {}) {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (search && search.trim()) params.append('search', search.trim());
    if (refresh) params.append('refresh', 'true');

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get(`/react/livetv/channels/${queryStr}`);
    return res.data;
  },

  /**
   * Returns stream URL, using direct link or fallback proxy if necessary
   */
  getStreamProxyUrl(streamUrl) {
    if (!streamUrl) return '';
    return `/react/livetv/proxy/?url=${encodeURIComponent(streamUrl)}`;
  },
};

export default liveTvApi;
