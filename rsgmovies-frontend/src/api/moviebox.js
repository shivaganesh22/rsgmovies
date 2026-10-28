import apiClient from './client';

// VPS Proxy base URL for Moviebox streams (dynamically HTTPS-aware to prevent blocked:mixed-content)
export const getMovieboxProxyBase = () => {
  if (import.meta.env.VITE_MOVIEBOX_PROXY_URL) {
    return import.meta.env.VITE_MOVIEBOX_PROXY_URL;
  }
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return `${window.location.origin}/stream-proxy`;
  }
  return 'http://129.225.111.76:5000';
};

export const MOVIEBOX_PROXY_BASE = getMovieboxProxyBase();

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
export const getProxiedStreamUrl = (targetUrl, headers, proxyBase) => {
  if (!targetUrl) return '';
  let base = (proxyBase || getMovieboxProxyBase()).replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && base.startsWith('http://129.225.111.76:5000')) {
    base = `${window.location.origin}/stream-proxy`;
  }
  const encodedTarget = encodeURIComponent(targetUrl);
  const h = encodeHeaders(headers);
  return `${base}/stream?url=${encodedTarget}${h ? `&h=${h}` : ''}`;
};

/**
 * Builds direct download URL with Content-Disposition attachment and filename
 */
export const getProxiedDownloadUrl = (targetUrl, headers, filename = '', proxyBase) => {
  if (!targetUrl) return '';
  let base = (proxyBase || getMovieboxProxyBase()).replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && base.startsWith('http://129.225.111.76:5000')) {
    base = `${window.location.origin}/stream-proxy`;
  }
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
