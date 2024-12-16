import React, { useRef, useState, useEffect } from 'react'
import { Dropdown } from "flowbite-react";
import { useAuth } from './other/AuthContext';
import MyLoader from './MyLoader';
import { toastSuccess, toastWarning } from './components/Notifications';

export default function Youtube() {
    const query = useRef("");
    const [queryData, setQuery] = useState("");
    const [quality, setQuality] = useState(JSON.parse(localStorage.getItem("youtubequality")) || '720');
    const [progress, setProgress] = useState(null);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const { startLoad, stopLoad } = useAuth();

    const video = {
        '360': 'MP4 (360P)', '480': 'MP4 (480P)', '720': 'MP4 (720P)', 
        '1080': 'MP4 (1080P)', '1440': 'MP4 (1440P)', '4k': 'WEBM 4K',
        'mp3': "MP3", 'm4a': "M4A", 'webm': "WEBM", 
        'aac': "AAC", 'flac': "FLAC", 'opus': "OPUS", 
        'ogg': "OGG", 'wav': "WAV"
    }

    const handleSubmit = (event) => {
        event.preventDefault();
        const inputValue = query.current.value.trim();
        if (inputValue) {
            setQuery(inputValue);
        }
    }

    const fetchProgress = async (downloadId) => {
        try {
            const response = await fetch(`https://rsg-movies.vercel.app/react/youtube/progress/?id=${downloadId}`);
            const result = await response.json();
            
            if (response.ok) {
                setProgress(result);
                
                // Stop loading if download is complete
                if (result.success === 1) {
                    setLoading(false);
                }
                
                return result;
            } else {
                toastWarning("Failed to get progress");
                setLoading(false);
                return null;
            }
        } catch (error) {
            console.error('Error fetching progress:', error);
            setLoading(false);
            return null;
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!queryData) return;

            setLoading(true);
            startLoad();
            setProgress(null);

            try {
                const response = await fetch(`https://rsg-movies.vercel.app/react/youtube/?url=${queryData}&quality=${quality}`);
                const result = await response.json();

                if (response.ok) {
                    setData(result);
                    
                    // If download is in progress, start polling for progress
                    if (result.id) {
                        let intervalId = setInterval(async () => {
                            const progressResult = await fetchProgress(result.id);
                            
                            // Stop interval if download is complete or fails
                            if (progressResult?.success === 1 || progressResult === null) {
                                clearInterval(intervalId);
                                setLoading(false);
                            }
                        }, 3000);

                        // Cleanup interval on component unmount
                        return () => clearInterval(intervalId);
                    } else {
                        setLoading(false);
                    }
                } else {
                    toastWarning("Failed to get results");
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
            } finally {
                stopLoad();
            }
        };

        fetchData();
    }, [queryData, quality]);

    return (
        <main>
            <center>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />

                <form className="max-w-md mx-auto">
                    <label className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                            </svg>
                        </div>
                        <input 
                            type="search" 
                            id="default-search" 
                            ref={query} 
                            autoComplete="off" 
                            onChange={handleSubmit} 
                            className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" 
                            placeholder="Enter Youtube Link..." 
                            required 
                        />
                        <button 
                            type="submit" 
                            onClick={handleSubmit} 
                            className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                        >
                            Search
                        </button>
                    </div>
                </form>

                <li className='block py-2 px-3 lg:p-0 text-gray-900 rounded hover:bg-gray-100 lg:hover:bg-transparent lg:hover:text-blue-700 lg:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700'>
                    <Dropdown
                        arrowIcon={true}
                        inline
                        label={
                            <label>{video[quality]}</label>
                        }
                    >   
                        <div className='max-h-64 overflow-y-auto'>
                            {Object.entries(video).map(([key, value]) => (
                                <Dropdown.Item 
                                    key={key} 
                                    className='dark:text-white' 
                                    onClick={() => { 
                                        setQuality(key); 
                                        localStorage.setItem("youtubequality", JSON.stringify(key)) 
                                    }}
                                >
                                    {value}
                                </Dropdown.Item>
                            ))}
                        </div>
                    </Dropdown>
                </li>

                <MyLoader>
                    {data && (
                        <main>
                            <div className="p-1">
                                <h5 className="mb-2 text-1xl font-bold tracking-tight text-gray-900 dark:text-white">
                                    {data.title}
                                </h5>
                            </div>
                            <img 
                                className="h-auto w-64 lg:w-80 rounded p-4 mx-auto" 
                                src={data.info.image} 
                                alt={data.title} 
                            />
                            
                            {progress && progress.success === 0 && (
                                <div className="w-full max-w-md">
                                    {/* Progress Bar */}
                                    <div className="bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                        <div
                                            className="bg-blue-600 h-2.5 rounded-full"
                                            style={{ width: `${progress.progress%100 || 0}%`,float: "left" }}
                                        ></div>
                                    </div>

                                    {/* Percentage Display */}
                                    <div className="m-1 w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
                                        <div className="p-1">
                                            <h5 className="text-black dark:text-white">
                                                {`${(progress.progress%100).toFixed(1) || 0}%`}
                                            </h5>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {progress==null &&data && (
                                <button className="w-64 text-xl text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-lg px-5 py-2.5 mr-2 mb-2 font-medium">
                                 Please Wait...
                             </button>
                            )}
                            {progress && progress.download_url && (
                                <a href={progress.download_url}>
                                    <button className="w-64 text-xl text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-lg px-5 py-2.5 mr-2 mb-2 font-medium">
                                        Download
                                    </button>
                                </a>
                            )}
                        </main>
                    )}
                </MyLoader>
            </center>
        </main>
    )
}