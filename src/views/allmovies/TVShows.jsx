import React, { useEffect, useState } from 'react';
import { useAuth } from '../other/AuthContext';
import { Link } from 'react-router-dom';
import Header2 from './Header2'
import Genres from './Genres';
import Years from './Years';
import TopMovies from './TopMovies';
import { toastWarning } from '../components/Notifications';
import { useParams } from 'react-router-dom';
import { Dropdown } from "flowbite-react";
import MyLoader from '../MyLoader';
export default function TVShows() {
    const { startLoad, stopLoad } = useAuth();
    const [data, setData] = useState("");
    const [spinner, setSpinner] = useState(true);
    const [playerSrc, setPlayerSrc] = useState("");
    const [active, setActive] = useState("1");
    const params = useParams();
    useEffect(() => {
        const fetchData = async () => {
            startLoad();
            try {
                const response = await fetch(`https://rsg-movies.vercel.app/react/allmovies/tvshows/${params.id}`);
                const result = await response.json();
                if (response.status == 200) {
                    setData(result);
                } else {
                    toastWarning("Failed to get results")
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }
            stopLoad();

        };
        fetchData()

    }, [params.id]);

    return (
        <main >
            <Header2></Header2>

            <div className="flex flex-col md:flex-row md:justify-between">
                <div className="md:w-9/12  border-b border-gray-200 dark:border-gray-700">



                    <MyLoader >
                        <div className='header2'>{data ? <>
                            <section className="flex justify-around flex-wrap py-5">
                                <center>
                                    <img className="rounded w-1/2 lg:mt-5 md:mt-14 md:h-56 md:w-auto" src={data.image} alt={data.name} />
                                </center>
                                <div className="max-w-2xl   text-gray-700 text-lg dark:text-white">
                                    <h1 className="lg:text-4xl md:text-3xl text-2xl md:text-left font-bold my-3 text-center lg:text-left">{data.name}</h1>
                                    <div className='my-4 text-left' >
                                        <p className='text-xs font-medium text-slate-500 dark:text-gray-400'>{data.extra}</p>

                                        <p className="py-2 font-medium text-gray-700 dark:text-gray-400 text-left text-xs">
                                            {data.genre.map((movie, index) => (
                                                <><Link to={`/allmovies/${encodeURIComponent(movie.link)}`} key={index}>   <span className='underline underline-offset-4'> {movie.name}</span>  <>&nbsp;&nbsp;</> </Link></>
                                            ))}
                                        </p>
                                        <p className='text-sm text-left text-slate-500 dark:text-gray-400'>{data.description}</p>
                                    </div>
                                </div>

                            </section>
                            <iframe className='w-full h-64 md:h-80' height="315" src={data.trailer} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
                            <h5 className="mt-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">Seasons</h5>
                            <div className='max-h-64 overflow-y-auto '>
                                <ul class="grid grid-cols-1 pt-2  gap-5 ">

                                    {data.seasons.map((movie, index) => (
                                        <>
                                            <li class="p-2 bg-white   w-full   border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700   overflow-hidden md:justify-self-center">
                                                <div class="flex items-center space-x-4 rtl:space-x-reverse">

                                                    <div class="flex-1 min-w-0">
                                                        <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                                                            {movie.name}
                                                        </p>


                                                    </div>

                                                </div>
                                                <div className='max-h-64 overflow-y-auto '>
                                            <ul class="grid grid-cols-1 pt-2 md:grid-cols-2 gap-5 ">

                                                {movie.episodes.map((genre, index) => (
                                                    <Link to={`/allmovies${genre.link}`}>
                                                        <li class="p-2 bg-white  hover:bg-gray-100 dark:hover:bg-gray-600 w-full w-sm  border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center">
                                                            <div class="flex items-center space-x-4 rtl:space-x-reverse">
                                                                <div class="flex-shrink-0" >
                                                                    <img class=" h-8 w-auto -8 rounded-full" src={genre.image} alt="Neil image" />
                                                                </div>
                                                                <div class="flex-shrink-0" >
                                                                <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                                                                        {genre.number}
                                                                    </p>
                                                                </div>
                                                                <div class="flex-1 min-w-0">
                                                                    <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                                                                        {genre.name}
                                                                    </p>
                                                                    <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                                                                        {genre.date}
                                                                    </p>

                                                                </div>

                                                            </div>
                                                        </li></Link>
                                                ))}

                                            </ul>
                                            </div>
                                            </li>
                                        </>
                                    ))}

                                </ul>
                           </div>


                            <div className='border-b pt-4 border-gray-200 dark:border-gray-700'></div>
                            <h5 className="mt-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">Director</h5>
                            <ul class="grid grid-cols-1 pt-2 md:grid-cols-2 gap-5 ">
                                <Link to={`/allmovies/${encodeURIComponent(data.director.link)}`}>
                                    <li class="p-2 bg-white  hover:bg-gray-100 dark:hover:bg-gray-600 w-full w-sm  border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center">
                                        <div class="flex items-center space-x-4 rtl:space-x-reverse">
                                            <div class="flex-shrink-0" >
                                                <img class=" w-8 h-auto -8 rounded-full" src={data.director.image} alt="Neil image" />
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                                                    {data.director.name}
                                                </p>
                                                <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                                                    {data.director.description}
                                                </p>

                                            </div>

                                        </div>
                                    </li></Link>
                            </ul>
                            <h5 className="mt-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">Cast</h5>
                            <div className='max-h-64 overflow-y-auto '>
                                <ul class="grid grid-cols-1 pt-2 md:grid-cols-2 gap-5 ">

                                    {data.actors.map((genre, index) => (
                                        <Link to={`/allmovies/${encodeURIComponent(genre.link)}`}>
                                            <li class="p-2 bg-white  hover:bg-gray-100 dark:hover:bg-gray-600 w-full w-sm  border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center">
                                                <div class="flex items-center space-x-4 rtl:space-x-reverse">
                                                    <div class="flex-shrink-0" >
                                                        <img class=" w-8 h-auto -8 rounded-full" src={genre.image} alt="Neil image" />
                                                    </div>
                                                    <div class="flex-1 min-w-0">
                                                        <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                                                            {genre.name}
                                                        </p>
                                                        <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                                                            {genre.description}
                                                        </p>

                                                    </div>

                                                </div>
                                            </li></Link>
                                    ))}

                                </ul>
                            </div>
                            <div className='border-b pt-4 border-gray-200 dark:border-gray-700'></div>
                            <div className="flex overflow-x-auto">
                                {data.images.map((movie, index) => (
                                    <div key={index} className="flex-none w-64 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 mr-4 my-4">
                                        <img className="rounded-t-lg h-40 w-auto" src={movie} alt="img" />
                                    </div>
                                ))}
                            </div>
                            <div className='max-h-64 overflow-y-auto '>
                                <ul class="grid grid-cols-1  md:grid-cols-2 gap-5 ">
                                    {data.custom.map((genre, index) => (

                                        <li class="p-2 bg-white  hover:bg-gray-100 dark:hover:bg-gray-600 w-full w-sm  border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center">
                                            <div class="flex items-center space-x-4">

                                                <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                                                    {genre.name}:
                                                </p>

                                                <div className="text-base  text-gray-900 dark:text-white" dangerouslySetInnerHTML={{ __html: genre.description }} />

                                            </div>
                                        </li>
                                    ))}

                                </ul>
                            </div>
                            <div className='border-b pt-4 border-gray-200 dark:border-gray-700'></div>
                            <h1 className=" text-2xl font-bold text-black dark:text-white text-left">Similar Movies</h1>
                            <div className="flex overflow-x-auto">
                                {data.movies.map((movie, index) => (
                                    <div key={index} className="flex-none  bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 mr-4 my-4">
                                        <Link to={`/allmovies${movie.link}`}>
                                            <img className="rounded-t-lg h-40 w-auto" src={movie.image} alt="img" />

                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </> : ""} </div></MyLoader>

                </div>
                <div className="  md:w-1/4 p-4 border-l border-r border-b border-gray-200 dark:border-gray-700 ">
                    <Genres></Genres>
                    <TopMovies></TopMovies>
                    <Years></Years>

                </div>
            </div>

        </main>
    )
}
