import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download } from 'lucide-react';
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
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
        >
          <ArrowLeft size={16} />
          <span>Back to Files</span>
        </button>

        {data.url && (
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-surface-elevated hover:bg-gray-700 text-gray-200 border border-gray-700 transition"
          >
            <Download size={14} />
            <span>Download Original</span>
          </a>
        )}
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
