import React, { useEffect, useState } from 'react';
import { Play, Star, Calendar, Eye, ChevronDown } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { toastWarning } from '../components/Notifications';

export default function SeriesDetailPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [showSeasonMenu, setShowSeasonMenu] = useState(false);

  const params = useParams();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(
        `https://rsg-movies.vercel.app/react/blast/series/${params.id}/`
      );
      const result = await response.json();
      if (!result.name) toastWarning("Failed to get results");
      setData(result);
      
      // Auto-select first season and first episode
      if (result.seasons && result.seasons.length > 0) {
        const firstSeason = result.seasons[0];
        setSelectedSeason(firstSeason);
        
        if (firstSeason.episodes && firstSeason.episodes.length > 0) {
          setSelectedEpisode(firstSeason.episodes[0]);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

   const filterVideos = (videos) => {
    if (!videos) return [];
    // Remove items that contain 'stream' or '.m3u8' in the server name
    return videos.filter(video => {
      const serverLower = video.server.toLowerCase();
      return !serverLower.includes('stream') && !serverLower.includes('.m3u8');
    });
  };

  const handleVideoSelect = (video) => {
    setPlayerLoading(true);
    setActiveVideo(video);
    setTimeout(() => setPlayerLoading(false), 500);
  };

  const handleSeasonChange = (season) => {
    setSelectedSeason(season);
    setShowSeasonMenu(false);
    setActiveVideo(null);
    
    if (season.episodes && season.episodes.length > 0) {
      setSelectedEpisode(season.episodes[0]);
    }
  };

  const handleEpisodeSelect = (episode) => {
    setSelectedEpisode(episode);
    setActiveVideo(null);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1E293B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
      </div>
    );
  }

  const currentVideos = filterVideos(selectedEpisode?.videos || []);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-[#1E293B] pt-16">
      {/* HERO SECTION */}
      <div className="relative -mt-16 w-full min-h-[420px] md:h-[500px]">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${data.backdrop_path_tv || data.backdrop_path})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-[#1E293B]/80 to-[#1E293B]/40"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E293B] via-transparent to-transparent"></div>
        </div>

        {/* Content container */}
        <div className="relative h-full flex items-end pb-8 pt-24 md:pt-0">
          <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 w-full">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 w-full items-end">
              {/* Poster */}
              <div className="flex-shrink-0 mx-auto md:mx-0">
                <img
                  src={data.poster_path}
                  alt={data.name}
                  className="w-40 sm:w-48 md:w-64 rounded-lg shadow-2xl"
                />
              </div>

              {/* Info */}
              <div className="flex-1 text-white text-center md:text-left">
                <h1 className="text-3xl md:text-5xl font-bold mb-3">
                  {data.name}
                </h1>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 mb-4 text-sm md:text-base">
                  {data.vote_average > 0 && (
                    <div className="flex items-center gap-1 bg-yellow-500 text-black px-3 py-1 rounded-full font-semibold">
                      <Star className="w-4 h-4 fill-current" />
                      {data.vote_average.toFixed(1)}
                    </div>
                  )}

                  {data.first_air_date && (
                    <div className="flex items-center gap-1 text-slate-300">
                      <Calendar className="w-4 h-4" />
                      {new Date(data.first_air_date).getFullYear()}
                    </div>
                  )}

                  {data.views?.toLocaleString()&&<div className="flex items-center gap-1 text-slate-300">
                    <Eye className="w-4 h-4" />
                    {data.views?.toLocaleString()} views
                  </div>}

                  {data.seasons && (
                    <div className="bg-red-600 text-white px-3 py-1 rounded-full font-semibold">
                      {data.seasons.length} Season{data.seasons.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Genres */}
                {data.genreslist && data.genreslist.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                    {data.genreslist.map((genre, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-slate-700/80 rounded-full text-xs md:text-sm font-medium"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Overview */}
                {data.overview && (
                  <p className="text-slate-200 text-sm md:text-base leading-relaxed max-w-3xl mx-auto md:mx-0">
                    {data.overview}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-16 py-8 md:py-12">
        {/* Season Selector */}
        {data.seasons && data.seasons.length > 0 && (
          <div className="mb-8">
            <div className="relative inline-block w-full md:w-auto">
              <button
                onClick={() => setShowSeasonMenu(!showSeasonMenu)}
                className="w-full md:min-w-[300px] flex items-center justify-between gap-4 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-all font-semibold"
              >
                <span>
                  {selectedSeason ? selectedSeason.name : 'Select Season'}
                </span>
                <ChevronDown className={`w-5 h-5 transition-transform ${showSeasonMenu ? 'rotate-180' : ''}`} />
              </button>

              {showSeasonMenu && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-700 rounded-lg shadow-2xl overflow-hidden z-50 border border-slate-200 dark:border-slate-600">
                  {data.seasons.map((season) => (
                    <button
                      key={season.id}
                      onClick={() => handleSeasonChange(season)}
                      className={`w-full text-left px-6 py-3 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors border-b border-slate-200 dark:border-slate-600 last:border-b-0 ${
                        selectedSeason?.id === season.id ? 'bg-red-50 dark:bg-red-900/30' : ''
                      }`}
                    >
                      <div className="font-semibold text-gray-900 dark:text-white">{season.name}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        {season.episodes?.length || 0} Episodes
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Player, Streams & Episodes Grid */}
        {data.name&&
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Left Column: Player and Streams */}
          <div className="lg:col-span-2 space-y-6">
            {/* Player */}
            <div className="bg-white dark:bg-slate-700 rounded-xl shadow-lg overflow-hidden">
              <div className="relative bg-black" style={{ paddingTop: '56.25%' }}>
                {playerLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-red-600"></div>
                  </div>
                )}

                {activeVideo ? (
                  <video 
                    key={activeVideo.link} 
                    className="absolute inset-0 w-full h-full" 
                    controls 
                    autoPlay
                    onLoadedData={() => setPlayerLoading(false)}
                  >
                    <source src={activeVideo.link} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center">
                      <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Select a source to start playing</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stream Sources - Moved Below Video */}
            {currentVideos.length > 0 && (
              <div className="bg-white dark:bg-slate-700 rounded-xl shadow-lg p-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 uppercase">
                  Stream Sources
                </h3>
                {/* Grid for sources */}
                <div className={`grid ${currentVideos.length>1?"grid-cols-2":"grid-cols-1"}  gap-3 max-h-80 overflow-y-auto`}>
                  {currentVideos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => handleVideoSelect(video)}
                      className={`text-left p-3 rounded-lg transition-all ${
                        activeVideo?.id === video.id
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white hover:bg-red-100 dark:hover:bg-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-semibold text-sm truncate">
                            {video.server}
                          </div>
                          {video.lang && (
                            <div className="text-xs opacity-80 mt-0.5">
                              {video.lang}
                            </div>
                          )}
                        </div>
                        <Play className="w-4 h-4 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Episodes List */}
          {selectedSeason && selectedSeason.episodes && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-700 rounded-xl shadow-lg p-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 uppercase">
                  Episodes
                </h3>
                <div className="space-y-2 max-h-[800px] overflow-y-auto">
                  {selectedSeason.episodes.map((episode) => (
                    <button
                      key={episode.id}
                      onClick={() => handleEpisodeSelect(episode)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedEpisode?.id === episode.id
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 dark:bg-slate-600 text-gray-900 dark:text-white hover:bg-red-100 dark:hover:bg-slate-500'
                      }`}
                    >
                      <div className="flex gap-3">
                        {episode.still_path_tv && (
                          <img
                            src={episode.still_path_tv}
                            alt={episode.name}
                            className="w-24 h-14 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold opacity-75">
                              EP {episode.episode_number}
                            </span>
                            {episode.vote_average > 0 && (
                              <span className="flex items-center gap-1 text-xs text-yellow-500">
                                <Star className="w-3 h-3 fill-current" />
                                {episode.vote_average.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-sm line-clamp-2">
                            {episode.name}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
 }
        {/* Cast */}
        {data.casterslist && data.casterslist.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4 uppercase">
              Cast
            </h2>

            <div className="overflow-x-auto pb-3 scrollbar-visible">
              <div className="flex gap-4">
                {data.casterslist.map((cast, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-24 sm:w-28 bg-white dark:bg-slate-700 rounded-xl shadow-md overflow-hidden"
                  >
                    <div className="relative w-full pb-[130%] bg-gray-800">
                      {cast.profile_path ? (
                        <img
                          src={cast.profile_path}
                          alt={cast.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-[10px] px-2 text-center">
                          {cast.name}
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <h4 className="font-semibold text-[11px] text-gray-900 dark:text-white line-clamp-1">
                        {cast.name}
                      </h4>
                      {cast.character && (
                        <p className="text-[10px] text-gray-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {cast.character}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scrollbar styling */}
      <style>{`
        *::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        *::-webkit-scrollbar-track {
          background: #1E293B;
          border-radius: 10px;
        }
        *::-webkit-scrollbar-thumb {
          background: #ef4444;
          border-radius: 10px;
        }
        *::-webkit-scrollbar-thumb:hover {
          background: #dc2626;
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: #ef4444 #1E293B;
        }
      `}</style>
    </main>
  );
}