import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo_h.png';

export const Footer = () => {
  return (
    <footer className="w-full border-t border-white/10 bg-surface/50 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="RSG Movies" className="h-7 object-contain" />
            </Link>
            <p className="text-xs text-gray-400">
              Premium media discovery & streaming platform.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-medium text-gray-400">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <Link to="/movies" className="hover:text-white transition">Movies</Link>
            <Link to="/series" className="hover:text-white transition">Series</Link>
            <Link to="/files" className="hover:text-white transition">Seedr Files</Link>
            <Link to="/youtube" className="hover:text-white transition">YouTube Downloader</Link>
            <Link to="/contact" className="hover:text-white transition">Contact Us</Link>
            <Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition">Terms & Conditions</Link>
          </div>

          <div className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} RSG Movies. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
