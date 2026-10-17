import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo_h.png';

export const Login = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-darkbg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-3xl shadow-2xl border border-white/10 relative z-10 text-center animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="RSG Movies" className="h-10 object-contain" />
        </div>

        <h1 className="text-2xl font-bold font-display text-white mb-2 tracking-tight">
          Welcome to RSG Movies
        </h1>
        <p className="text-sm text-gray-400 mb-8">
          Sign in to access your personal movie library, stream media, and manage cloud files.
        </p>

        {/* Microsoft Entra Login Button */}
        <button
          onClick={login}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition duration-200 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-[0.98] group"
        >
          {/* Microsoft SVG Icon */}
          <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#F25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
            <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
          </svg>
          <span>Sign in with Microsoft</span>
        </button>

        <p className="text-xs text-gray-500 mt-6 uppercase tracking-wider font-medium">
          Authorized users only
        </p>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-center gap-6 text-xs text-gray-400">
          <Link to="/privacy" className="hover:text-blue-400 transition">Privacy Policy</Link>
          <span>&bull;</span>
          <Link to="/terms" className="hover:text-blue-400 transition">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
