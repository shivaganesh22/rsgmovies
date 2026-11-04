import { apiClient } from './client';

let statusCache = null;
let statusCacheTime = 0;
const STATUS_CACHE_TTL = 15000; // 15 seconds

export const netmirrorApi = {
  getStatus: async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && statusCache && (now - statusCacheTime < STATUS_CACHE_TTL)) {
      return statusCache;
    }
    const response = await apiClient.get('/react/netmirror/status/');
    statusCache = response.data;
    statusCacheTime = now;
    return response.data;
  },
  resetSession: async () => {
    statusCache = null;
    statusCacheTime = 0;
    const response = await apiClient.post('/react/netmirror/new-session/', {}, {
      headers: {
        Accept: 'application/json',
      },
    });
    return response.data;
  },
};

export default netmirrorApi;
