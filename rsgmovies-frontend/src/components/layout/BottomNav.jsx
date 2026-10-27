import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Film,
  Tv,
  Folder,
  Globe,
  X,
  Download,
  Magnet,
  Sparkles,
} from 'lucide-react';

export const BottomNav = () => {
  const location = useLocation();
  const [isStreamsOpen, setIsStreamsOpen] = useState(false);

  const streamsActive = [
    '/livetv',
    '/torrents',
    '/movierulz',
    '/tamilmv',
    '/allmovies',
    '/ibomma',
    '/youtube',
  ].some((path) => location.pathname.startsWith(path));

  const navItemClass = (isActive) =>
    `flex flex-col items-center justify-center flex-1 py-1.5 text-[11px] font-medium transition-colors ${
      isActive ? 'text-blue-400 font-bold' : 'text-gray-400 hover:text-gray-200'
    }`;

  return (
    <>
      {/* Streams Slide-up Bottom Sheet Modal */}
      {isStreamsOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end md:hidden animate-fade-in"
          onClick={() => setIsStreamsOpen(false)}
        >
          <div
            className="glass-dropdown bg-darkbg border-t border-white/10 rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe size={18} className="text-blue-400" />
                Streams & Downloader
              </h3>
              <button
                onClick={() => setIsStreamsOpen(false)}
                className="p-1.5 rounded-full bg-surface-elevated text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <NavLink
                to="/livetv"
                onClick={() => setIsStreamsOpen(false)}
                className="col-span-1 p-3.5 rounded-2xl bg-gradient-to-br from-red-950/70 to-rose-950/70 border border-red-500/40 text-left flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Tv size={20} className="text-red-400" />
                  <span className="px-1.5 py-0.2 text-[8px] font-bold rounded-full bg-red-600 text-white animate-pulse">
                    LIVE
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Live TV</p>
                  <p className="text-[10px] text-gray-400">740+ Channels</p>
                </div>
              </NavLink>

              <NavLink
                to="/torrents"
                onClick={() => setIsStreamsOpen(false)}
                className="col-span-1 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/70 to-teal-950/70 border border-emerald-500/40 text-left flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Magnet size={20} className="text-emerald-400" />
                  <span className="px-1.5 py-0.2 text-[8px] font-bold rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">
                    P2P
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Torrents</p>
                  <p className="text-[10px] text-gray-400">Search Engine</p>
                </div>
              </NavLink>

              <NavLink
                to="/movierulz"
                onClick={() => setIsStreamsOpen(false)}
                className="p-4 rounded-2xl bg-surface-card border border-white/5 hover:border-blue-500/40 text-center space-y-1 block"
              >
                <Film size={22} className="mx-auto text-blue-400" />
                <p className="text-sm font-semibold text-white">Movierulz</p>
                <p className="text-[10px] text-gray-400">Telugu & South</p>
              </NavLink>

              <NavLink
                to="/tamilmv"
                onClick={() => setIsStreamsOpen(false)}
                className="p-4 rounded-2xl bg-surface-card border border-white/5 hover:border-blue-500/40 text-center space-y-1 block"
              >
                <Film size={22} className="mx-auto text-cyan-400" />
                <p className="text-sm font-semibold text-white">TamilMV</p>
                <p className="text-[10px] text-gray-400">Tamil & Multi</p>
              </NavLink>

              <NavLink
                to="/istream"
                onClick={() => setIsStreamsOpen(false)}
                className="p-4 rounded-2xl bg-surface-card border border-white/5 hover:border-blue-500/40 text-center space-y-1 block"
              >
                <Globe size={22} className="mx-auto text-blue-400" />
                <p className="text-sm font-semibold text-white">iStreamFlare</p>
                <p className="text-[10px] text-gray-400">Global Hub</p>
              </NavLink>

              {/* AllMovies & IBomma commented out per user preference
              <NavLink
                to="/allmovies"
                onClick={() => setIsStreamsOpen(false)}
                className="p-4 rounded-2xl bg-surface-card border border-white/5 hover:border-blue-500/40 text-center space-y-1 block"
              >
                <Tv size={22} className="mx-auto text-purple-400" />
                <p className="text-sm font-semibold text-white">AllMovies</p>
                <p className="text-[10px] text-gray-400">Global Stream Hub</p>
              </NavLink>

              <NavLink
                to="/ibomma"
                onClick={() => setIsStreamsOpen(false)}
                className="p-4 rounded-2xl bg-surface-card border border-white/5 hover:border-blue-500/40 text-center space-y-1 block"
              >
                <Film size={22} className="mx-auto text-pink-400" />
                <p className="text-sm font-semibold text-white">IBomma</p>
                <p className="text-[10px] text-gray-400">Direct Streams</p>
              </NavLink>
              */}

              <NavLink
                to="/ytmate"
                onClick={() => setIsStreamsOpen(false)}
                className="p-4 rounded-2xl bg-surface-card border border-white/5 hover:border-blue-500/40 text-center space-y-1 block"
              >
                <Download size={22} className="mx-auto text-blue-400" />
                <p className="text-sm font-semibold text-white">YT Mate</p>
                <p className="text-[10px] text-gray-400">Recommended</p>
              </NavLink>
              <NavLink
                to="/youtube"
                onClick={() => setIsStreamsOpen(false)}
                className="p-4 rounded-2xl bg-surface-card border border-white/5 hover:border-red-500/40 text-center space-y-1 block"
              >
                <Download size={22} className="mx-auto text-red-400" />
                <p className="text-sm font-semibold text-white">YouTube Downloader</p>
                <p className="text-[10px] text-gray-400">Video & Audio</p>
              </NavLink>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar (Mobile only: md:hidden) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-darkbg/95 backdrop-blur-xl border-t border-white/10 md:hidden pb-safe">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
          {/* Home */}
          <NavLink
            to="/"
            end
            className={({ isActive }) => navItemClass(isActive)}
          >
            <Home size={20} className="mb-0.5" />
            <span>Home</span>
          </NavLink>

          {/* Movies */}
          <NavLink
            to="/movies"
            className={({ isActive }) => navItemClass(isActive)}
          >
            <Film size={20} className="mb-0.5" />
            <span>Movies</span>
          </NavLink>

          {/* Moviebox */}
          <NavLink
            to="/moviebox"
            className={({ isActive }) => navItemClass(isActive)}
          >
            <Sparkles size={20} className="mb-0.5 text-amber-400" />
            <span>Moviebox</span>
          </NavLink>

          {/* Series */}
          <NavLink
            to="/series"
            className={({ isActive }) => navItemClass(isActive)}
          >
            <Tv size={20} className="mb-0.5" />
            <span>Series</span>
          </NavLink>

          {/* Streams (Pop-up sheet) */}
          <button
            onClick={() => setIsStreamsOpen(true)}
            className={navItemClass(streamsActive)}
          >
            <Globe size={20} className="mb-0.5" />
            <span>Streams</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default BottomNav;
