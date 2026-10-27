import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Home, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

export const PageNotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4">
      <div className="max-w-md w-full glass-panel p-8 sm:p-12 rounded-3xl border border-white/10 shadow-2xl space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-blue-600/10 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/20 text-3xl font-black font-display">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
            Page Not Found
          </h1>
          <p className="text-sm text-gray-400">
            The page or media title you are looking for does not exist or may have been moved.
          </p>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="primary" size="md" icon={<Home size={16} />}>
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PageNotFound;
