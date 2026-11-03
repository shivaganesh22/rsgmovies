import React, { useState, useRef } from 'react';
import { RotateCcw, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import netmirrorApi from '../../api/netmirror';

export const NetmirrorHome = () => {
  const [iframeKey, setIframeKey] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);

  const handleResetSession = async () => {
    try {
      setIsResetting(true);
      setResetMessage('Resetting...');
      const res = await netmirrorApi.resetSession();
      setResetMessage(res?.message || 'Session reset');
      setIframeKey((prev) => prev + 1);
      setTimeout(() => setResetMessage(null), 3000);
    } catch (err) {
      setResetMessage('Failed to reset');
      setTimeout(() => setResetMessage(null), 3000);
    } finally {
      setIsResetting(false);
    }
  };

  const handleReloadFrame = () => {
    setIframeKey((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="space-y-2 animate-fade-in pb-10">
      {/* Compact Controls Bar: 3 buttons only */}
      <div className="flex items-center justify-end gap-2 px-1">
        {resetMessage && (
          <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg animate-fade-in mr-auto sm:mr-0">
            {resetMessage}
          </span>
        )}

        {/* 1. New Session */}
        <button
          onClick={handleResetSession}
          disabled={isResetting}
          title="Reset session and generate fresh token"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RotateCcw size={13} className={isResetting ? 'animate-spin' : ''} />
          <span>{isResetting ? 'Resetting...' : 'New Session'}</span>
        </button>

        {/* 2. Refresh */}
        <button
          onClick={handleReloadFrame}
          title="Reload page"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>

        {/* 3. Fullscreen */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          className="p-1.5 rounded-xl text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>

      {/* Embedded NetMirror Frame */}
      <div
        ref={containerRef}
        className="w-full h-[calc(100vh-140px)] min-h-[720px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-black"
      >
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src="/react/netmirror/"
          title="NetMirror"
          className="w-full h-full border-0 block"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          loading="eager"
        />
      </div>
    </div>
  );
};

export default NetmirrorHome;
