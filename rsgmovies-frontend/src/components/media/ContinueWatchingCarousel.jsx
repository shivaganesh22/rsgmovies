import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, PlayCircle, Trash2 } from 'lucide-react';
import { getWatchHistory, clearWatchHistory } from '../../utils/watchHistory';
import ContinueWatchingCard from './ContinueWatchingCard';

export const ContinueWatchingCarousel = () => {
  const [history, setHistory] = useState([]);
  const scrollRef = useRef(null);

  const loadHistory = () => {
    const items = getWatchHistory();
    setHistory(items);
  };

  useEffect(() => {
    loadHistory();
    const handleStorage = (e) => {
      if (e.key === 'rsg_watch_history') {
        loadHistory();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleItemRemoved = (removedItem) => {
    setHistory((prev) => prev.filter((it) => it.key !== removedItem.key && it.id !== removedItem.id));
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all items from Continue Watching?')) {
      clearWatchHistory();
      setHistory([]);
    }
  };

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 animate-fade-in">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PlayCircle size={20} className="text-blue-500" />
          <h2 className="text-lg sm:text-xl font-bold font-display text-white tracking-tight">
            Continue Watching
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30">
            {history.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClearAll}
            className="p-1.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-white/5 transition text-xs flex items-center gap-1 mr-1"
            title="Clear Watch History"
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline text-[11px]">Clear</span>
          </button>
          <button
            onClick={() => handleScroll('left')}
            className="p-1.5 rounded-xl bg-surface hover:bg-surface-elevated text-gray-300 hover:text-white transition shadow border border-white/5"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="p-1.5 rounded-xl bg-surface hover:bg-surface-elevated text-gray-300 hover:text-white transition shadow border border-white/5"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 16:9 Cards Row */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth"
      >
        {history.map((item) => (
          <ContinueWatchingCard
            key={item.key || item.id}
            item={item}
            onRemove={handleItemRemoved}
          />
        ))}
      </div>
    </section>
  );
};

export default ContinueWatchingCarousel;
