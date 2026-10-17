import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tv, CheckCircle2, XCircle, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import authApi from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';

const TVLoginApprovePage = () => {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('req');
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null); // 'APPROVED' | 'REJECTED' | null
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!requestId) {
      setError('No TV authentication request ID was provided in the link.');
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const data = await authApi.getTVRequestDetails(requestId);
        setDetails(data);
      } catch (err) {
        setError(err.response?.data?.error?.message || 'Invalid or expired QR code.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [requestId]);

  const handleAction = async (action) => {
    try {
      setActionLoading(true);
      const res = await authApi.approveTVRequest(requestId, action);
      setStatus(res.status);
    } catch (err) {
      setError(err.response?.data?.error?.message || `Failed to ${action} TV login.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    // Redirect to Entra login
    authApi.login();
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-surface-card border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4 text-blue-400 shadow-inner">
            <Tv size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Android TV Login</h1>
          <p className="text-sm text-gray-400 mt-1">Approve sign-in for your RSG Movies TV app</p>
        </div>

        {/* Loading State */}
        {(loading || authLoading) && (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-blue-400" size={36} />
            <p className="text-sm text-gray-400">Verifying authentication request...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && !authLoading && error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 mb-6">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">{error}</p>
              <p className="text-xs text-gray-400 mt-1">Please scan the QR code on your TV screen again.</p>
            </div>
          </div>
        )}

        {/* Success State */}
        {!loading && !authLoading && status === 'APPROVED' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-xl font-black text-white">TV Sign-In Approved!</h2>
            <p className="text-sm text-gray-300 mt-2">
              Your TV has been securely authenticated. You can now return to your TV screen to enjoy RSG Movies.
            </p>
            <div className="mt-6">
              <Button variant="secondary" className="w-full justify-center" onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </div>
          </div>
        )}

        {/* Rejected State */}
        {!loading && !authLoading && status === 'REJECTED' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <XCircle size={36} />
            </div>
            <h2 className="text-xl font-black text-white">Request Rejected</h2>
            <p className="text-sm text-gray-300 mt-2">The TV login request was cancelled.</p>
            <div className="mt-6">
              <Button variant="secondary" className="w-full justify-center" onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </div>
          </div>
        )}

        {/* Active Confirmation State */}
        {!loading && !authLoading && !error && !status && details && (
          <div>
            {/* Device Info Card */}
            <div className="p-4 rounded-2xl bg-surface border border-white/10 mb-6 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Device</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Tv size={14} className="text-blue-400" />
                  {details.device_name || 'Android TV'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Security Status</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={14} /> Single-Use Verified
                </span>
              </div>
            </div>

            {/* If user is NOT authenticated on phone */}
            {!isAuthenticated ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                  Please log in with your Microsoft Entra account on this device first to approve the TV connection.
                </div>
                <Button
                  variant="primary"
                  className="w-full justify-center text-sm font-bold py-3"
                  onClick={handleLoginRedirect}
                >
                  Sign In with Microsoft
                </Button>
              </div>
            ) : (
              /* If user IS authenticated on phone */
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-surface-elevated border border-white/5 text-xs text-gray-300 flex items-center justify-between">
                  <span className="text-gray-400">Signing in as:</span>
                  <span className="font-bold text-white">{user?.display_name || user?.upn}</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="primary"
                    className="flex-1 justify-center py-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 border-emerald-500/40 text-white"
                    onClick={() => handleAction('approve')}
                    isLoading={actionLoading}
                    icon={<CheckCircle2 size={18} />}
                  >
                    Approve TV Login
                  </Button>
                  <Button
                    variant="danger"
                    className="sm:w-auto justify-center py-3 text-sm font-bold"
                    onClick={() => handleAction('reject')}
                    disabled={actionLoading}
                    icon={<XCircle size={18} />}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TVLoginApprovePage;
