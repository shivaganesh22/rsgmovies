import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Sparkles } from 'lucide-react';
import seedrApi from '../../api/seedr';
import VideoPlayer from '../../components/media/VideoPlayer';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';

export const PlayerPage = () => {
  const { mode, id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['seedrPlayer', mode, id],
    queryFn: async () => {
      if (mode === 'folder') {
        return seedrApi.getFolderFilePlayer(id);
      }
      return seedrApi.getFilePlayer(id);
    },
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError || !data || !data.url) {
    return <ErrorState onRetry={refetch} message="Could not retrieve video stream link from Seedr." />;
  }

  const streamUrl = data.m3u8 || data.url;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft size={16} />
          <span>Back to Files</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/player/advanced/${mode}/${id}`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition shadow-lg shadow-blue-500/20"
          >
            <Sparkles size={14} />
            <span>Advanced Player</span>
          </button>

          {data.url && (
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-surface-elevated hover:bg-gray-700 text-gray-200 border border-gray-700 transition"
            >
              <Download size={14} />
              <span>Download</span>
            </a>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h1 className="text-xl sm:text-2xl font-bold font-display text-white truncate">
          {data.name || 'Playing Seedr Video'}
        </h1>

        <VideoPlayer
          src={streamUrl}
          title={data.name || 'Seedr Video'}
        />
      </div>
    </div>
  );
};

export default PlayerPage;
