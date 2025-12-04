import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Star, Play } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toastWarning } from '../components/Notifications'
import debounce from 'lodash.debounce';
export default function MovieHomepage() {
  const [data, setData] = useState(null);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [spinner, setSpinner] = useState(false);
  const query = useRef("");
  const [queryData, setQuery] = useState(JSON.parse(localStorage.getItem("blastquery")) || "");
  const [queryMovies, setQueryMovies] = useState(JSON.parse(localStorage.getItem("blastquerymovies")) || []);
  useEffect(() => {
    // Load data from localStorage or fetch from API
    const storedData = localStorage.getItem('movieHomeData');
    const alreadyFetchedThisSession = sessionStorage.getItem('movieHomeFetched');
    if (storedData) {
      setData(JSON.parse(storedData));
      setLoading(false);
    } 
    if (!alreadyFetchedThisSession) {
      fetchData();
      sessionStorage.setItem('movieHomeFetched', 'true');
    }
  }, []);
const searchFetch = async () => {
      try {
        const response = await fetch(`https://rsg-movies.vercel.app/react/blast/search/?query=${query.current.value}`);
        const result = await response.json();
        if (response.status == 200 && result.search) {
          setQueryMovies(result.search);
          localStorage.setItem("blastquerymovies", JSON.stringify(result.search));
        }
        else {
          toastWarning("Failed to get results")
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setSpinner(false)
    };

  const handleSubmit = (event) => {
      event.preventDefault();
      setQuery(query.current.value);
      localStorage.setItem("blastquery", JSON.stringify(query.current.value))
      setSpinner(true);
      if (query.current.value) {
        searchFetch();
      }
      else {
        localStorage.removeItem("blastquerymovies");
      }
    }
    const handleChange = () => {
      localStorage.setItem("blastquery", JSON.stringify(query.current.value))
      // setSpinner(true);
      if (query.current.value) {
        // searchFetch();
      }
      else {
        localStorage.removeItem("blastquerymovies");
      }
    }
    const debounce = (func) => {
      let timer;
      return function (...args) {
        const context = this;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          timer = null;
          func.apply(context, args);
        }, 300)
      }
    }
    const optimized = useCallback(debounce(handleChange), [])
  const fetchData = async () => {
    try {
      const response = await fetch('https://rsg-movies.vercel.app/react/blast/home/');
      const result = await response.json();
      setData(result);
      localStorage.setItem('movieHomeData', JSON.stringify(result));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  // Auto-slide featured section
  useEffect(() => {
    if (data?.featured?.length > 0) {
      const interval = setInterval(() => {
        setFeaturedIndex((prev) => (prev + 1) % data.featured.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [data]);

  const handleNavigate = (type, id) => {
    navigate(`/${type.toLowerCase()  == 'serie' ? 'series' : 'movie'}/${id}`);
  };

  const FeaturedSlider = () => {
    if (!data?.featured || data.featured.length === 0) return null;

    const currentItem = data.featured[featuredIndex];

    return (
      <div className="relative w-full h-[450px] md:h-[500px] mb-4 overflow-hidden rounded-none md:rounded-xl">
        {/* Background Image with Gradient */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out"
          style={{ 
            backgroundImage: `url(${currentItem.backdrop_path_tv || currentItem.backdrop_path})`,
          }}
        >
          {/* Gradients updated to match #1E293B */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B] via-[#1E293B]/70 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E293B]/90 via-transparent to-transparent"></div>
        </div>

        {/* Content */}
        <div className="relative h-full flex items-end pb-8 md:pb-12 px-4 md:px-8 lg:px-16">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-8 w-full">
            {/* Poster */}
            <div 
              onClick={() => handleNavigate(currentItem.type, currentItem.featured_id)}
              className="flex-shrink-0 group cursor-pointer mx-auto md:mx-0"
            >
              <div className="relative w-[120px] h-[180px] md:w-[240px] md:h-[360px] rounded-lg overflow-hidden shadow-2xl transform transition-transform duration-300 group-hover:scale-105">
                <img 
                  src={currentItem.poster_path} 
                  alt={currentItem.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                  <Play className="w-10 md:w-16 h-10 md:h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 fill-current" />
                </div>
                {/* Quality Badge */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <div className="bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                    HD
                  </div>
                  <div className="flex items-center gap-1 bg-black/70 text-white px-2 py-1 rounded">
                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    <span className="text-[10px] md:text-xs font-semibold">{currentItem.vote_average}</span>
                  </div>
                </div>
              </div>
            </div>

           {/* Info */}
            <div className="flex-1 text-white max-w-2xl">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 leading-tight">
                {currentItem.title}
              </h2>
              
              {/* Meta Info */}
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4 text-xs md:text-base flex-wrap">
                <span className="text-gray-300 font-medium">{new Date(currentItem.release_date).getFullYear()}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-300 font-medium">{currentItem.genre}</span>
              </div>

              {/* Overview */}
              <p className="text-gray-200 text-sm md:text-base mb-4 md:mb-6 line-clamp-2 md:line-clamp-3">
                {currentItem.overview}
              </p>

              {/* Action Button */}
              <button 
                onClick={() => handleNavigate(currentItem.type, currentItem.featured_id)}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 md:px-8 py-2 md:py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 text-sm md:text-base"
              >
                <Play className="w-4 md:w-5 h-4 md:h-5 fill-current" />
                Watch Now
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        {data.featured.length > 1 && (
          <>
            <button 
              onClick={() => setFeaturedIndex((prev) => (prev - 1 + data.featured.length) % data.featured.length)}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 md:p-3 rounded-full transition-all duration-300 z-10"
            >
              <ChevronLeft className="w-5 md:w-6 h-5 md:h-6" />
            </button>
            <button 
              onClick={() => setFeaturedIndex((prev) => (prev + 1) % data.featured.length)}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 md:p-3 rounded-full transition-all duration-300 z-10"
            >
              <ChevronRight className="w-5 md:w-6 h-5 md:h-6" />
            </button>
          </>
        )}

        {/* Dots Navigation */}
        {data.featured.length > 1 && (
          <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {data.featured.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setFeaturedIndex(idx)}
                className={`h-1.5 md:h-2 rounded-full transition-all duration-300 ${
                  idx === featuredIndex 
                    ? 'bg-red-600 w-6 md:w-8' 
                    : 'bg-white/50 hover:bg-white/70 w-1.5 md:w-2'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const MovieSection = ({ title, items, sectionKey, isEpisodeSection = false }) => {
    const scrollContainerRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    if (!items || items.length === 0) return null;

    const scroll = (direction) => {
      const container = scrollContainerRef.current;
      if (container) {
        const scrollAmount = container.offsetWidth * 0.8;
        container.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth'
        });
      }
    };

    const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (container) {
        setShowLeftArrow(container.scrollLeft > 0);
        setShowRightArrow(
          container.scrollLeft < container.scrollWidth - container.offsetWidth - 10
        );
      }
      
    };
const handleViewAll = () => {
      // Navigate to the view-all page with the specific section key
      navigate(`/view-all/${sectionKey}`);
    };

    return (
      <div className="mb-8 md:mb-12">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4 px-4 md:px-8">
          <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
            {title}
          </h3>
          <button 
            onClick={handleViewAll}
            className="group flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-semibold text-xs md:text-sm transition-all duration-300 transform hover:scale-105"
          >
            View All
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Movies Container */}
        <div className="relative group">
          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={() => scroll('left')}
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Scrollable Container */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex gap-3 md:gap-4 overflow-x-auto px-4 md:px-8 pb-4 scroll-smooth"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#ef4444 #1E293B' // Scrollbar track updated
            }}
          >
            {items.map((item, index) => (
              isEpisodeSection ? (
                <EpisodeCard key={`${item.id}-${index}`} item={item} onNavigate={handleNavigate} />
              ) : (
                <MovieCard key={`${item.id}-${index}`} item={item} onNavigate={handleNavigate} />
              )
            ))}
          </div>

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={() => scroll('right')}
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 items-center justify-center"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    );
  };

  const EpisodeCard = ({ item, onNavigate }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div 
        onClick={() => onNavigate('Serie', item.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex-shrink-0 w-56 md:w-72 cursor-pointer"
      >
        {/* Updated card bg to slate-700 */}
        <div className="relative rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gray-200 dark:bg-slate-700">
          {/* Landscape Image */}
          <img 
            src={item.still_path} 
            alt={item.name}
            className="w-full h-32 md:h-40 object-cover"
          />
          
          {/* Hover Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-10 md:w-12 h-10 md:h-12 text-white" />
            </div>
          </div>

          {/* Episode Info Badge */}
          <div className="absolute top-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-semibold">
            S{item.season_number}E{item.episode_number}
          </div>
        </div>

        {/* Card Info */}
        <div className="mt-2 px-1">
          <h4 className={`text-xs md:text-sm font-semibold dark:text-white line-clamp-1 transition-colors ${
            isHovered ? 'text-red-600 dark:text-red-500' : 'text-gray-900 dark:text-white'
          }`}>
            {item.name}: S{item.season_number}E{item.episode_number}: {item.episode_name}
          </h4>
        </div>
      </div>
    );
  };

  const MovieCard = ({ item, onNavigate }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
      <div 
        onClick={() => onNavigate(item.type, item.id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex-shrink-0 w-32 md:w-40 cursor-pointer"
      >
        {/* Updated card bg to slate-700 */}
        <div className="relative rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-gray-200 dark:bg-slate-700">
          {/* Image */}
          <img 
            src={item.poster_path || item.still_path} 
            alt={item.name}
            className="w-full h-44 md:h-56 object-cover"
          />
          
          {/* Hover Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="w-8 md:w-10 h-8 md:h-10 text-white" />
            </div>
          </div>

          {/* Top Right Badge - Quality */}
          {item.quality && (
            <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg uppercase">
              {item.quality}
            </div>
          )}

          {/* Subtitle Badge */}
          {item.subtitle && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold shadow-lg uppercase">
              {item.subtitle}
            </div>
          )}

          {/* New Episodes Badge */}
          {item.newEpisodes > 0 && (
            <div className="absolute bottom-2 left-2 right-2 bg-red-600 text-white text-[10px] py-1 text-center font-bold uppercase tracking-wide rounded">
              New Episodes
            </div>
          )}

          {/* Episode Info for Series */}
          {item.season_number && item.episode_number && (
            <div className="absolute top-2 left-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
              S{item.season_number}E{item.episode_number}
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="mt-2 px-1">
          <h4 className={`text-xs md:text-sm font-semibold dark:text-white line-clamp-1 transition-colors ${
            isHovered ? 'text-red-600 dark:text-red-500' : 'text-gray-900 dark:text-white'
          }`}>
            {item.name}
            {item.episode_name && `: ${item.episode_name}`}
          </h4>
          <p className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            {item.release_date ? new Date(item.release_date).getFullYear() : ''}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1E293B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600"></div>
      </div>
    );
  }
  

  return (
    // Updated Main BG to #1E293B
    <main className="min-h-screen bg-gray-50 dark:bg-[#1E293B] pb-8">
      <FeaturedSlider />
      <form className="max-w-md mx-auto mb-4" onSubmit={handleSubmit}>
                  <label className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                      </svg>
                    </div>
                    <input type="search" id="default-search" ref={query} value={queryData} autoComplete="off" onChange={() => { setQuery(query.current.value); optimized() }} className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Search Movies,Series,Animes here..." />
                    <button type="submit" className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Search</button>
                  
                
                <div id="dropdown" className={`z-50 ${queryData ? "" : "hidden"} w-full absolute mt-2 bg-white dark:bg-[#1E293B] rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden ring-1 ring-black/5`}>
  <div className="">
    <ul className="w-full">
      {/* Loading Spinner */}
      {spinner ? (
        <li className="py-8 flex justify-center items-center border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-[#1E293B]">
          <center>
            <svg aria-hidden="true" className="w-8 h-8 text-center text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
              <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
            </svg>
            <span className="sr-only">Loading...</span>
          </center>
        </li>
      ) : ""}

      {/* Results List */}
      <div className='max-h-[60vh] overflow-y-auto custom-scrollbar bg-white dark:bg-[#1E293B]'>
        {queryMovies.map((genre, index) => (
          <Link 
            to={`/${genre.type?.toLowerCase() === 'serie' ? 'series' : 'movie'}/${genre.id}`} 
            key={index}
         
          >
            <li className="group flex items-start gap-4 px-4 py-3 bg-white dark:bg-[#1E293B] border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all duration-200">
              
              {/* Poster Image (Rectangular Professional Style) */}
              <div className="flex-shrink-0 relative w-12 h-[72px] rounded-md overflow-hidden bg-gray-200 dark:bg-slate-700 shadow-sm group-hover:shadow-md transition-all">
                <img 
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" 
                  src={`${genre.poster_path}`} 
                  alt={genre.name}
                  loading="lazy"
                  onError={(e) => { e.target.style.display = 'none'; }} 
                />
              </div>

              {/* Content Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center h-[72px]">
                {/* Top Row: Title & Type Badge */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-red-600 transition-colors">
                    {genre.name}
                  </p>
                  
                  <span className={`flex-shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm border ${
                    genre.type?.toLowerCase() === 'serie' 
                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' 
                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                  }`}>
                    {genre.type === 'serie' ? 'Series' : 'Movie'}
                  </span>
                </div>

                {/* Bottom Row: Metadata (Year, Rating, Genre) */}
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400 mt-auto">
                  {/* Year */}
                  <div className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    <span>{genre.release_date ? genre.release_date.substring(0, 4) : 'N/A'}</span>
                  </div>
                  
                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-600"></span>

                  {/* Rating */}
                  {genre.vote_average > 0 ? (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      <span className="font-medium text-gray-700 dark:text-slate-200">{genre.vote_average.toFixed(1)}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide opacity-70">NR</span>
                  )}

                  {/* Genre */}
                  {genre.genre_name && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-slate-600"></span>
                      <span className="truncate max-w-[80px] text-gray-600 dark:text-slate-300">
                        {genre.genre_name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </li>
          </Link>
        ))}
      </div>

      {/* Footer Close Button */}
      <Link 
        onClick={() => { setQuery(""); localStorage.removeItem("blastquery"); localStorage.removeItem("blastquerymovies") }} 
        className="block w-full text-center py-3 bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm font-medium text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-slate-700 transition-colors cursor-pointer"
      >
        Close
      </Link>
    </ul>
  </div>
</div>
      
                </div>
                </form>
      {/* Featured Slider */}
      

      {/* Content Sections */}
      <div className="space-y-4">
        {data?.pinned && <MovieSection title="Pinned" items={data.pinned} sectionKey="pinned" />}
       {data?.rvcontent?.['New HD Released'] && (
          <MovieSection title="New HD Released" items={data.rvcontent['New HD Released']} sectionKey="new-hd" />
        )}
        
        {data?.latest_movies && <MovieSection title="Latest Movies" items={data.latest_movies} sectionKey="latest-movies" />}
        {data?.latest_episodes && <MovieSection title="Latest Series Episodes" items={data.latest_episodes} sectionKey="latest-episodes" isEpisodeSection={true} />}
        {data?.recommended && <MovieSection title="Recommended For You" items={data.recommended} sectionKey="recommended" />}
        {data?.trending && <MovieSection title="Trending Now" items={data.trending} sectionKey="trending" />}
        {data?.choosed && <MovieSection title="Choosed For You" items={data.choosed} sectionKey="choosed" />}
        {data?.popularSeries && <MovieSection title="Popular Series" items={data.popularSeries} sectionKey="popular-series" />}
        {data?.latest && <MovieSection title="Recently Added" items={data.latest} sectionKey="recently-added" />}
        {data?.recents && <MovieSection title="Latest Series" items={data.recents} sectionKey="latest-series" />}
        {data?.thisweek && <MovieSection title="New This Week" items={data.thisweek} sectionKey="this-week" />}
        {data?.popular && <MovieSection title="Most Popular" items={data.popular} sectionKey="popular" />}
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        /* Webkit browsers (Chrome, Safari, Edge) */
        *::-webkit-scrollbar {
          height: 10px;
        }
        *::-webkit-scrollbar-track {
          background: #1E293B; /* Matches background */
          border-radius: 10px;
        }
        *::-webkit-scrollbar-thumb {
          background: #ef4444;
          border-radius: 10px;
        }
        *::-webkit-scrollbar-thumb:hover {
          background: #dc2626;
        }
        
        /* Firefox */
        * {
          scrollbar-width: thin;
          scrollbar-color: #ef4444 #1E293B;
        }
      `}</style>
    </main>
  );
}