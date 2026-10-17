import React from 'react';
import { Navigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isLoading, isAdmin, isMaintenance } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkbg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-medium">Loading RSG Movies...</p>
        </div>
      </div>
    );
  }

  // Maintenance mode screen for non-admin users
  if (isMaintenance && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkbg px-4">
        <div className="max-w-md w-full glass-panel p-8 rounded-2xl text-center shadow-2xl border border-yellow-500/20">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/10 rounded-full flex items-center justify-center text-yellow-400 text-2xl font-bold">
            ⚠️
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Under Maintenance</h2>
          <p className="text-gray-400 mb-6">
            RSG Movies is currently undergoing scheduled maintenance. Please check back shortly.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full glass-panel p-8 rounded-2xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center text-red-400 text-2xl">
            🔒
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-6">
            Administrator privileges are required to access this area.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
