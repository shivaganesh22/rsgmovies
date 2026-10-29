import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Tv } from 'lucide-react';
import seedrApi from '../../api/seedr';
import MoviAdvancedPlayer from '../../components/media/MoviAdvancedPlayer';
import ErrorState from '../../components/ui/ErrorState';

export const AdvancedPlayerPage = () => {
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
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-400">Loading stream data...</p>
      </div>
    );
  }

  if (isError || !data || !data.url) {
    return <ErrorState onRetry={refetch} message="Could not retrieve video stream link from Seedr." />;
  }

  const rawUrl = data.url;
  const fileName = data.name || 'Seedr Video';

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-16 px-2 sm:px-4">
      {/* Top Navigation & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/5"
        >
          <ArrowLeft size={16} />
          <span>Back to Files</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Switch to Standard Player */}
          <button
            onClick={() => navigate(`/player/${mode}/${id}`)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-surface-elevated hover:bg-gray-700 text-gray-300 border border-gray-700 transition"
            title="Switch back to Standard Player"
          >
            <Tv size={14} />
            <span>Standard Player</span>
          </button>

          {/* Download Button */}
          {rawUrl && (
            <a
              href={rawUrl}
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

      {/* Main Player Display */}
      <div className="space-y-3">
        <h1 className="text-lg sm:text-xl font-bold font-display text-white truncate max-w-3xl">
          {fileName}
        </h1>

        {/* Movi Player Component */}
        <MoviAdvancedPlayer
          src={rawUrl}
          title={fileName}
        />
      </div>
    </div>
  );
};

export default AdvancedPlayerPage;
