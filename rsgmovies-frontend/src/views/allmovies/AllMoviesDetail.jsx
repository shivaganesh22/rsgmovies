import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Play } from 'lucide-react';
import scrapersApi from '../../api/scrapers';
import VideoPlayer from '../../components/media/VideoPlayer';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';

export const AllMoviesDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [streamUrl, setStreamUrl] = useState(null);

  const movieData = location.state?.movieData || {};

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['allmoviesMovie', id],
    queryFn: () => scrapersApi.getAllMoviesMovie(id),
  });

  const links = data?.links || [];

  const handlePlayStream = async (link) => {
    try {
      const res = await scrapersApi.getAllMoviesPlayer(link);
      if (res?.url || res?.link) {
        setStreamUrl(res.url || res.link);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {
      console.error('Failed to fetch player stream:', e);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-16">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      {/* Video Player */}
      {streamUrl && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Now Playing</h3>
            <Button variant="ghost" size="sm" onClick={() => setStreamUrl(null)}>
              Close Player
            </Button>
          </div>
          <VideoPlayer src={streamUrl} title={movieData.name || movieData.title} />
        </div>
      )}

      <div className="rounded-3xl glass-panel p-6 sm:p-8 border border-white/10 flex flex-col md:flex-row gap-6">
        {(movieData.image || movieData.poster) && (
          <div className="w-48 aspect-[2/3] rounded-2xl overflow-hidden bg-surface flex-shrink-0 mx-auto shadow-xl">
            <img
              src={movieData.image || movieData.poster}
              alt={movieData.name || movieData.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex-1 space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
            {movieData.name || movieData.title || `Movie #${id}`}
          </h1>

          <div className="pt-4 border-t border-white/10 space-y-3">
            <h3 className="text-sm font-semibold text-gray-300">Available Stream Servers:</h3>
            {isLoading ? (
              <p className="text-xs text-gray-400">Loading stream links...</p>
            ) : isError ? (
              <ErrorState onRetry={refetch} message="Could not fetch stream links." />
            ) : links.length === 0 ? (
              <p className="text-xs text-gray-400">No stream links available for this title.</p>
            ) : (
              <div className="space-y-2">
                {links.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated border border-white/5"
                  >
                    <span className="text-xs font-semibold text-gray-200">
                      {item.name || `Server ${idx + 1}`}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handlePlayStream(item.link || item.url)}
                      icon={<Play size={14} className="fill-current" />}
                    >
                      Stream
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllMoviesDetail;
