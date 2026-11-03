import { apiClient } from './client';

export const netmirrorApi = {
  getStatus: async () => {
    const response = await apiClient.get('/react/netmirror/status/');
    return response.data;
  },
  resetSession: async () => {
    const response = await apiClient.post('/react/netmirror/new-session/', {}, {
      headers: {
        Accept: 'application/json',
      },
    });
    return response.data;
  },
};

export default netmirrorApi;
