import React from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Play } from 'lucide-react';
import scrapersApi from '../../api/scrapers';
import VideoPlayer from '../../components/media/VideoPlayer';
import ErrorState from '../../components/ui/ErrorState';

export const IBommaDetail = () => {
  const [searchParams] = useSearchParams();
  const link = searchParams.get('link') || '';
  const location = useLocation();
  const navigate = useNavigate();

  const movieData = location.state?.movieData || {};

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ibommaMovie', link],
    queryFn: () => scrapersApi.getIbommaMovie(link),
    enabled: Boolean(link),
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState onRetry={refetch} message="Could not load IBomma stream." />;
  }

  const streamUrl = data?.url || data?.link || '';

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-16">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-white">
          {movieData.name || 'IBomma Movie Stream'}
        </h1>

        {streamUrl ? (
          <VideoPlayer src={streamUrl} poster={movieData.image} title={movieData.name} />
        ) : (
          <div className="glass-panel p-8 text-center text-gray-400 rounded-2xl">
            Stream link currently unavailable.
          </div>
        )}
      </div>
    </div>
  );
};

export default IBommaDetail;
