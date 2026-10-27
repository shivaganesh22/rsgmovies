import React, { useRef, useState, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import Modal from '../ui/Modal';

export const TrailerModal = ({ isOpen, onClose, previewPath, trailerUrl, title }) => {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Extract YouTube embed URL and direct watch URL
  let embedUrl = null;
  let youtubeWatchUrl = null;
  let youtubeId = null;

  if (previewPath) {
    // preview_path is typically a YouTube ID or key
    youtubeId = previewPath.includes('youtube.com') || previewPath.includes('youtu.be')
      ? previewPath.split('v=')[1]?.split('&')[0] || previewPath.split('/').pop()
      : previewPath;
    embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&enablejsapi=1`;
    youtubeWatchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
  } else if (trailerUrl) {
    if (trailerUrl.includes('youtube.com') || trailerUrl.includes('youtu.be')) {
      youtubeId = trailerUrl.split('v=')[1]?.split('&')[0] || trailerUrl.split('/').pop();
      embedUrl = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&enablejsapi=1`;
      youtubeWatchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    } else {
      embedUrl = trailerUrl;
      youtubeWatchUrl = trailerUrl;
    }
  }

  // Handle mobile landscape rotation and fullscreen sync
  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        }
        setIsFullscreen(true);

        // Lock to landscape on mobile devices
        if (window.screen?.orientation && typeof window.screen.orientation.lock === 'function') {
          window.screen.orientation.lock('landscape').catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        setIsFullscreen(false);

        // Unlock orientation on exit
        if (window.screen?.orientation && typeof window.screen.orientation.unlock === 'function') {
          window.screen.orientation.unlock();
        }
      }
    } catch (err) {
      console.warn('[TrailerModal] Fullscreen error:', err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(isCurrentlyFs);
      if (!isCurrentlyFs && window.screen?.orientation && typeof window.screen.orientation.unlock === 'function') {
        window.screen.orientation.unlock();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      if (window.screen?.orientation && typeof window.screen.orientation.unlock === 'function') {
        window.screen.orientation.unlock();
      }
    };
  }, []);

  const handleClose = () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => {});
    }
    if (window.screen?.orientation && typeof window.screen.orientation.unlock === 'function') {
      window.screen.orientation.unlock();
    }
    onClose();
  };

  const headerActions = (
    <div className="flex items-center gap-2 mr-1">
      {youtubeWatchUrl && (
        <a
          href={youtubeWatchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 hover:text-red-300 border border-red-500/30 transition flex items-center gap-1.5 text-xs font-semibold shadow-sm active:scale-95"
          title="Open in YouTube"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          <span className="hidden sm:inline">YouTube</span>
        </a>
      )}
      <button
        onClick={toggleFullscreen}
        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition flex items-center justify-center"
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title ? `${title} — Official Trailer` : 'Trailer'}
      maxWidth="max-w-4xl"
      headerActions={headerActions}
    >
      <div
        ref={containerRef}
        className={`relative aspect-video w-full rounded-xl overflow-hidden bg-black mt-2 group ${
          isFullscreen ? 'fixed inset-0 z-[9999] rounded-none mt-0 h-screen w-screen aspect-auto' : ''
        }`}
      >
        {embedUrl ? (
          embedUrl.includes('.mp4') ? (
            <video
              src={embedUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <iframe
              src={embedUrl}
              title={title || 'Trailer'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="w-full h-full border-0"
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Trailer is not available for this title.
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TrailerModal;
