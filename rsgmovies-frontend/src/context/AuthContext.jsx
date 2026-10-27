import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authApi from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [isSessionRevoked, setIsSessionRevoked] = useState(false);
  const [revokedMessage, setRevokedMessage] = useState('');
  const [sessionDialogTitle, setSessionDialogTitle] = useState('Session Ended');

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await authApi.getMe();
      if (data && data.authenticated && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        setRole(data.user.role || 'User');
        setIsSessionRevoked(false);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setRole(null);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setUser(null);
        setIsAuthenticated(false);
        setRole(null);
      } else if (err.response?.status === 403) {
        // User inactive or blocked
        setUser(null);
        setIsAuthenticated(false);
        setRole(null);
      } else if (err.response?.status === 503) {
        setIsMaintenance(true);
        setMaintenanceMessage(err.response?.data?.error?.message || 'Under Maintenance');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // Listen to global interceptor events
    const handleSessionRevoked = (e) => {
      setSessionDialogTitle('Session Terminated');
      setIsSessionRevoked(true);
      setRevokedMessage(e.detail?.message || 'Your session was opened on another device.');
      setIsAuthenticated(false);
      setUser(null);
    };

    const handleSessionExpired = (e) => {
      setSessionDialogTitle('Session Expired');
      setIsSessionRevoked(true);
      setRevokedMessage(e.detail?.message || 'Your session has expired. Please sign in again to continue.');
      setIsAuthenticated(false);
      setUser(null);
    };

    const handleMaintenance = (e) => {
      setIsMaintenance(true);
      setMaintenanceMessage(e.detail?.message || 'RSG Movies is currently under maintenance.');
    };

    window.addEventListener('rsg:session_revoked', handleSessionRevoked);
    window.addEventListener('rsg:session_expired', handleSessionExpired);
    window.addEventListener('rsg:maintenance_mode', handleMaintenance);

    return () => {
      window.removeEventListener('rsg:session_revoked', handleSessionRevoked);
      window.removeEventListener('rsg:session_expired', handleSessionExpired);
      window.removeEventListener('rsg:maintenance_mode', handleMaintenance);
    };
  }, [checkAuth]);

  const login = () => {
    authApi.login();
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (_) {}
    setUser(null);
    setIsAuthenticated(false);
    setRole(null);
    setStorageInfo(null);
    window.location.href = '/login';
  };

  const dismissRevokedModal = () => {
    setIsSessionRevoked(false);
    window.location.href = '/login';
  };

  const isAdmin = role === 'Admin' || user?.role === 'Admin';

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    role,
    storageInfo,
    setStorageInfo,
    isMaintenance,
    maintenanceMessage,
    setIsMaintenance,
    isSessionRevoked,
    revokedMessage,
    sessionDialogTitle,
    dismissRevokedModal,
    checkAuth,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
