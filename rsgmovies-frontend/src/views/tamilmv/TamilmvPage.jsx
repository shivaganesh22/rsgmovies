import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles, Film, Download, Search, ChevronRight } from 'lucide-react';
import scrapersApi from '../../api/scrapers';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';

const LANGUAGES = ['All', 'Telugu', 'Tamil', 'Hindi', 'Malayalam', 'Kannada', 'English'];

export const TamilmvPage = () => {
  const [filterText, setFilterText] = useState('');
  const [activeLang, setActiveLang] = useState('All');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tamilmv'],
    queryFn: () => scrapersApi.getTamilmv(),
  });

  const feedItems = data?.items || [];

  const filteredItems = feedItems.filter((item) => {
    const matchesText =
      (item.name || '').toLowerCase().includes(filterText.toLowerCase()) ||
      (item.slug || '').toLowerCase().includes(filterText.toLowerCase());

    const itemLangs = (item.languages || [item.language || '']).map((l) => l.toLowerCase());
    const matchesLang =
      activeLang === 'All' || itemLangs.includes(activeLang.toLowerCase());

    return matchesText && matchesLang;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in pb-16 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-2">
            <Sparkles size={13} />
            <span>1TamilMV Live Feed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
            TamilMV Releases
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Latest torrent releases across South Indian & Bollywood cinema with direct magnets & download links.
          </p>
        </div>

        <div className="max-w-xs w-full">
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search TamilMV releases..."
            icon={<Search size={16} />}
          />
        </div>
      </div>

      {/* Language Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            onClick={() => setActiveLang(lang)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeLang === lang
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-surface-elevated hover:bg-white/10 text-gray-300 border border-white/5'
            }`}
          >
            <Film size={13} />
            <span>{lang}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isError ? (
        <ErrorState onRetry={refetch} message="Could not load TamilMV feed. Active mirrors may be updating." />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-20 bg-surface rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No releases found"
          message={filterText ? `No releases matching "${filterText}".` : 'No releases found for this filter.'}
          icon={<Film size={32} />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredItems.map((item, idx) => {
            const isCamOrPreDvd = ['PREDVD', 'DVDSCR', 'HDTS', 'CAM'].includes((item.quality || '').toUpperCase());
            const displayLangs = item.languages && item.languages.length > 0 ? item.languages : [item.language || 'Multi'];

            return (
              <Link
                key={item.topic_id || idx}
                to={`/tamilmv/movie?link=${encodeURIComponent(item.link)}`}
                className="group flex items-center justify-between p-4 rounded-2xl glass-panel border border-white/5 hover:border-emerald-500/40 transition hover:-translate-y-1 duration-200 shadow hover:shadow-xl gap-3"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition shadow">
                    <Film size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* Multi-Language Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {displayLangs.map((lang, lIdx) => (
                        <span
                          key={lIdx}
                          className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-surface-elevated text-emerald-400 border border-emerald-500/20"
                        >
                          {lang}
                        </span>
                      ))}

                      {item.quality && (
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            isCamOrPreDvd
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {item.quality}
                        </span>
                      )}

                      {item.year && (
                        <span className="text-[10px] text-gray-400 font-medium">
                          ({item.year})
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-400 transition truncate leading-snug">
                      {item.name}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-emerald-400 flex-shrink-0 pl-2">
                  <span className="hidden sm:inline">Downloads</span>
                  <ChevronRight size={16} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TamilmvPage;
