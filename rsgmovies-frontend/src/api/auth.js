import apiClient from './client';

export const authApi = {
  /**
   * Fetches the current authenticated user's profile and session metadata.
   */
  async getMe() {
    const res = await apiClient.get('/api/auth/me/');
    return res.data;
  },

  /**
   * Initiates Microsoft Entra ID OpenID Connect login redirect.
   */
  login() {
    window.location.href = '/api/auth/login/';
  },

  /**
   * Terminates the current Django server-side session.
   */
  async logout() {
    try {
      const res = await apiClient.post('/api/auth/logout/');
      return res.data;
    } catch (e) {
      console.error('Logout error:', e);
      return { success: false };
    }
  },

  /**
   * Retrieves public metadata for a pending TV QR login request.
   */
  async getTVRequestDetails(requestId) {
    const res = await apiClient.get(`/api/tv/auth/qr/details/?request_id=${encodeURIComponent(requestId)}`);
    return res.data;
  },

  /**
   * Approves or rejects a pending TV QR login request.
   */
  async approveTVRequest(requestId, action = 'approve') {
    const res = await apiClient.post('/api/tv/auth/qr/approve/', {
      request_id: requestId,
      action: action,
    });
    return res.data;
  },
};

export default authApi;
