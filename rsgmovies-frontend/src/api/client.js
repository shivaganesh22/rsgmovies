import axios from 'axios';

// Base API URL: Defaults to empty string for same-origin browser requests (/api, /react, /health)
// Local dev uses Vite proxy (vite.config.js) to forward requests to http://127.0.0.1:8000
// Production uses Vercel rewrites (vercel.json) to forward requests to https://rsg-movies.vercel.app
const BASE_URL = import.meta.env.VITE_API_URL || '';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Sends Django sessionid and csrftoken cookies automatically
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000,
});

// Response interceptor for session expiration, revocation, and maintenance mode
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data, config } = error.response;
      const errorCode = data?.error?.code || data?.code;
      const url = config?.url || '';

      // Skip global event dispatching for initial auth probe and login check
      const isAuthCheck = url.includes('/api/auth/me/') || url.includes('/api/auth/login');

      // 1. Handle Single Active Session Revocation (Logged in elsewhere)
      if (status === 401 && errorCode === 'SESSION_REVOKED') {
        window.dispatchEvent(
          new CustomEvent('rsg:session_revoked', {
            detail: {
              message: data?.error?.message || 'Your session ended because your account was logged into from another browser or device.'
            }
          })
        );
      }
      // 2. Handle General 401 Unauthorized / Session Expired on any active page
      else if (status === 401 && !isAuthCheck) {
        window.dispatchEvent(
          new CustomEvent('rsg:session_expired', {
            detail: {
              message: data?.error?.message || 'Your session has expired. Please sign in again to continue.'
            }
          })
        );
      }

      // 3. Handle Maintenance Mode
      if (status === 503 && errorCode === 'MAINTENANCE_MODE') {
        window.dispatchEvent(
          new CustomEvent('rsg:maintenance_mode', {
            detail: { message: data?.error?.message || 'RSG Movies is currently under maintenance.' }
          })
        );
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
