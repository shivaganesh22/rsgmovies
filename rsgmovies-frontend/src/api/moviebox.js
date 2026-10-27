import apiClient from './client';

// VPS Proxy base URL for Moviebox streams
export const MOVIEBOX_PROXY_BASE = import.meta.env.VITE_MOVIEBOX_PROXY_URL || 'http://129.225.111.76:5000';

/**
 * Encodes headers dictionary into URL-safe base64 string
 */
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

/**
 * Builds proxied stream URL with upstream headers encoded in query string
 */
export const getProxiedStreamUrl = (targetUrl, headers, proxyBase = MOVIEBOX_PROXY_BASE) => {
  if (!targetUrl) return '';
  const base = (proxyBase || MOVIEBOX_PROXY_BASE).replace(/\/+$/, '');
  const encodedTarget = encodeURIComponent(targetUrl);
  const h = encodeHeaders(headers);
  return `${base}/stream?url=${encodedTarget}${h ? `&h=${h}` : ''}`;
};

/**
 * Builds direct download URL with Content-Disposition attachment and filename
 */
export const getProxiedDownloadUrl = (targetUrl, headers, filename = '', proxyBase = MOVIEBOX_PROXY_BASE) => {
  if (!targetUrl) return '';
  const base = (proxyBase || MOVIEBOX_PROXY_BASE).replace(/\/+$/, '');
  const encodedTarget = encodeURIComponent(targetUrl);
  const h = encodeHeaders(headers);
  const cleanName = filename ? encodeURIComponent(filename) : '';
  return `${base}/stream?url=${encodedTarget}&download=1${cleanName ? `&filename=${cleanName}` : ''}${h ? `&h=${h}` : ''}`;
};

export const movieboxApi = {
  async getHome() {
    const res = await apiClient.get('/react/moviebox/home/');
    return res.data;
  },

  async search(query, page = 1, perPage = 20) {
    if (!query) return [];
    const res = await apiClient.get(`/react/moviebox/search/?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`);
    return res.data;
  },

  async getDetails(subjectId) {
    const res = await apiClient.get(`/react/moviebox/detail/${subjectId}/`);
    return res.data;
  },

  async getEpisodes(subjectId) {
    const res = await apiClient.get(`/react/moviebox/episode/${subjectId}/`);
    return res.data;
  },

  async getStreams(subjectId, season = 0, episode = 0) {
    const res = await apiClient.get(`/react/moviebox/streams/${subjectId}/${season}/${episode}/`);
    return res.data;
  },

  getProxiedStreamUrl,
  getProxiedDownloadUrl,
  encodeHeaders,
};

export default movieboxApi;
