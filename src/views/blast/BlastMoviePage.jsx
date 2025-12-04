import React, { useEffect, useState } from 'react';
import { Play, Star, Calendar, Clock, Eye } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { toastWarning } from '../components/Notifications';

export default function MovieDetailPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [playerLoading, setPlayerLoading] = useState(false);

  const params = useParams();

  useEffect(() => {
    fetchData();
    setActiveVideo(null);
  }, [params.id]);

  const fetchData = async () => {
    try {
      const response = await fetch(
        `https://rsg-movies.vercel.app/react/blast/movie/${params.id}/`
      );
      const result = await response.json();
      if (!result.title) toastWarning("Failed to get results");
      setData(result);
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
    // Timeout to simulate loading or wait for browser to initialize video
    setTimeout(() => setPlayerLoading(false), 500);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1E293B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
      </div>
    );
  }

  const currentVideos = filterVideos(data.videos || []);

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
                  alt={data.title}
                  className="w-40 sm:w-48 md:w-64 rounded-lg shadow-2xl"
                />
              </div>

              {/* Info */}
              <div className="flex-1 text-white text-center md:text-left">
                <h1 className="text-3xl md:text-5xl font-bold mb-3">
                  {data.title}
                </h1>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 mb-4 text-sm md:text-base">
                  {data.vote_average > 0 && (
                    <div className="flex items-center gap-1 bg-yellow-500 text-black px-3 py-1 rounded-full font-semibold">
                      <Star className="w-4 h-4 fill-current" />
                      {data.vote_average.toFixed(1)}
                    </div>
                  )}

                  {data.subtitle && (
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full font-semibold uppercase text-xs">
                      {data.subtitle}
                    </span>
                  )}

                  {data.release_date && (
                    <div className="flex items-center gap-1 text-slate-300">
                      <Calendar className="w-4 h-4" />
                      {new Date(data.release_date).getFullYear()}
                    </div>
                  )}

                  {data.runtime && (
                    <div className="flex items-center gap-1 text-slate-300">
                      <Clock className="w-4 h-4" />
                      {data.runtime} min
                    </div>
                  )}

                  {data.views?.toLocaleString()&&<div className="flex items-center gap-1 text-slate-300">
                    <Eye className="w-4 h-4" />
                    {data.views?.toLocaleString()} views
                  </div>}
                </div>

                {/* Genres */}
                {data.genres && data.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                    {data.genres.map((genre, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-slate-700/80 rounded-full text-xs md:text-sm font-medium"
                      >
                        {genre.name}
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
        {/* Grid Layout: Player (Left) and Streams (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          
          {/* Player Section - Takes 2/3 width on desktop */}
          {data.title&&<div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-700 rounded-xl shadow-lg overflow-hidden sticky top-20">
              <div className="relative bg-black" style={{ paddingTop: '56.25%' }}>
                {playerLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-red-600"></div>
                  </div>
                )}

                {activeVideo ? (
                  // Native Video Player
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
          </div>}

          {/* Stream Sources Section - Takes 1/3 width on desktop */}
          <div className="lg:col-span-1">
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
        </div>

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