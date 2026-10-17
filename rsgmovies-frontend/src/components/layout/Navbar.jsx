import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Folder,
  Search,
  Download,
  Mail,
  Shield,
  LogOut,
  ChevronDown,
  User as UserIcon,
  HardDrive,
  Globe,
  Film,
  Tv,
  Magnet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo_h.png';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout, storageInfo } = useAuth();
  const [isScraperOpen, setIsScraperOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const scraperMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
      if (scraperMenuRef.current && !scraperMenuRef.current.contains(e.target)) {
        setIsScraperOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinkClass = ({ isActive }) =>
    `px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'text-blue-400 bg-blue-500/10 font-semibold'
        : 'text-gray-300 hover:text-white hover:bg-white/5'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 bg-darkbg/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo & Desktop Nav */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="RSG Movies" className="h-8 object-contain" />
            </Link>

            <nav className="hidden md:flex items-center gap-1.5">
              <NavLink to="/" className={navLinkClass} end>
                Home
              </NavLink>
              <NavLink to="/movies" className={navLinkClass}>
                Movies
              </NavLink>
              <NavLink to="/series" className={navLinkClass}>
                Series
              </NavLink>
              <NavLink to="/istream" className={navLinkClass}>
                iStreamFlare
              </NavLink>
              <NavLink to="/files" className={navLinkClass}>
                Files
              </NavLink>

              {/* Streams Dropdown (includes YouTube/Media Downloader) */}
              <div className="relative" ref={scraperMenuRef}>
                <button
                  onClick={() => setIsScraperOpen(!isScraperOpen)}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition"
                >
                  <Globe size={15} />
                  <span>Streams</span>
                  <ChevronDown size={14} className={`transition-transform ${isScraperOpen ? 'rotate-180' : ''}`} />
                </button>

                {isScraperOpen && (
                  <div className="absolute left-0 mt-2 w-56 glass-dropdown rounded-2xl shadow-2xl py-2 z-50 animate-fade-in border border-gray-700/70 bg-darkbg">
                    <Link
                      to="/livetv"
                      onClick={() => setIsScraperOpen(false)}
                      className="flex items-center justify-between px-4 py-2 text-sm text-red-400 font-semibold hover:text-red-300 hover:bg-red-600/20"
                    >
                      <div className="flex items-center gap-2.5">
                        <Tv size={15} className="text-red-400" />
                        <span>Live TV</span>
                      </div>
                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-red-600 text-white animate-pulse">
                        LIVE
                      </span>
                    </Link>
                    <Link
                      to="/torrents"
                      onClick={() => setIsScraperOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-emerald-400 font-semibold hover:text-emerald-300 hover:bg-emerald-600/20"
                    >
                      <Magnet size={15} className="text-emerald-400" />
                      <span>Torrent Search</span>
                    </Link>
                    <Link
                      to="/movierulz"
                      onClick={() => setIsScraperOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/20"
                    >
                      <Film size={15} className="text-blue-400" />
                      <span>Movierulz</span>
                    </Link>
                    <Link
                      to="/tamilmv"
                      onClick={() => setIsScraperOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/20"
                    >
                      <Film size={15} className="text-cyan-400" />
                      <span>TamilMV</span>
                    </Link>
                    {/* AllMovies & IBomma commented out per user preference
                    <Link
                      to="/allmovies"
                      onClick={() => setIsScraperOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/20"
                    >
                      <Tv size={15} className="text-purple-400" />
                      <span>AllMovies</span>
                    </Link>
                    <Link
                      to="/ibomma"
                      onClick={() => setIsScraperOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-blue-600/20"
                    >
                      <Film size={15} className="text-pink-400" />
                      <span>IBomma</span>
                    </Link>
                    */}
                    <div className="my-1 border-t border-white/10" />
                    <Link
                      to="/ytmate"
                      onClick={() => setIsScraperOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-blue-400 font-semibold hover:text-blue-300 hover:bg-blue-600/20"
                    >
                      <Download size={15} />
                      <span>YT Mate</span>
                    </Link>
                    <Link
                      to="/youtube"
                      onClick={() => setIsScraperOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 font-semibold hover:text-red-300 hover:bg-red-600/20"
                    >
                      <Download size={15} />
                      <span>YouTube Downloader</span>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Right: Search, Storage & Profile Menu */}
          <div className="flex items-center gap-3">
            {/* Search Icon */}
            <Link
              to="/search"
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition"
              title="Search"
            >
              <Search size={18} />
            </Link>

            {/* Storage Quota Indicator (Visible on Mobile & Desktop) */}
            {isAuthenticated && storageInfo && (
              <Link
                to="/files"
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-gray-300 bg-surface-elevated rounded-xl border border-gray-700/60 hover:border-blue-500/50 transition"
                title="Seedr Cloud Storage"
              >
                <HardDrive size={12} className="text-blue-400 flex-shrink-0" />
                <span className="truncate">{storageInfo}</span>
              </Link>
            )}

            {/* User Profile Dropdown */}
            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm">
                    {user?.display_name ? user.display_name.charAt(0).toUpperCase() : <UserIcon size={16} />}
                  </div>
                  <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 glass-dropdown rounded-2xl shadow-2xl py-2 z-50 animate-fade-in border border-gray-700/70 bg-darkbg">
                    {/* User header: username and email only */}
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-sm font-semibold text-white truncate">
                        {user?.display_name || user?.upn || 'User'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {user?.email || user?.upn}
                      </p>
                    </div>

                    {/* Admin Link (Moved to Profile Menu) */}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/10 transition"
                      >
                        <Shield size={16} />
                        <span>Admin Dashboard</span>
                      </Link>
                    )}

                    <Link
                      to="/files"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition"
                    >
                      <Folder size={16} />
                      <span>Seedr Files</span>
                    </Link>

                    {/* Contact Link (Moved to Profile Menu) */}
                    <Link
                      to="/contact"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition"
                    >
                      <Mail size={16} />
                      <span>Contact Support</span>
                    </Link>

                    <div className="my-1 border-t border-white/10" />

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition text-left"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-lg shadow-blue-500/20"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
