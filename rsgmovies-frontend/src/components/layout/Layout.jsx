import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import Footer from './Footer';
import ScrollToTopButton from '../common/ScrollToTopButton';
import ErrorBoundary from '../common/ErrorBoundary';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { AlertTriangle, LogIn } from 'lucide-react';

export const Layout = ({ children, hideNav = false, hideFooter = false }) => {
  const {
    isSessionRevoked,
    revokedMessage,
    sessionDialogTitle,
    dismissRevokedModal,
    isMaintenance,
    maintenanceMessage,
    isAdmin,
  } = useAuth();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-darkbg text-gray-100 flex flex-col selection:bg-blue-600 selection:text-white pb-14 md:pb-0">
        {/* Maintenance Banner for Admins */}
        {isMaintenance && isAdmin && (
          <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-200 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <span>
              Maintenance Mode Active: {maintenanceMessage || 'Normal user traffic is blocked.'}
            </span>
          </div>
        )}

        {!hideNav && <Navbar />}

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children || <Outlet />}
        </main>

        {!hideFooter && <Footer />}

        {/* Mobile YouTube-style Bottom Navigation Bar */}
        {!hideNav && <BottomNav />}

        {/* Floating Scroll to Top Arrow Button */}
        <ScrollToTopButton />

        {/* Single Active Session Conflict / Expiration Modal */}
        <Modal
          isOpen={isSessionRevoked}
          onClose={dismissRevokedModal}
          title={sessionDialogTitle || "Session Ended"}
          showClose={false}
        >
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4 text-2xl">
              ⚠️
            </div>
            <p className="text-gray-300 text-sm mb-6">
              {revokedMessage || 'Your account was signed into on another device. Only one active session is permitted at a time.'}
            </p>
            <Button
              variant="primary"
              className="w-full"
              onClick={dismissRevokedModal}
              icon={<LogIn size={16} />}
            >
              Sign In Again
            </Button>
          </div>
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default Layout;
