import React, { useEffect, useState } from 'react';
import { useAuth } from '../other/AuthContext';
import { Link } from 'react-router-dom';
import Header2 from './Header2'
import Genres from './Genres';
import Years from './Years';
import TopMovies from './TopMovies';
import { toastWarning } from '../components/Notifications';
import { useParams } from 'react-router-dom';
import MyLoader from '../MyLoader';
export default function AllMoviesLinks() {
    const { startLoad, stopLoad } = useAuth();
    const [data, setData] = useState("");
    const params = useParams();
    useEffect(() => {
        const fetchData = async () => {
            startLoad();
            try {
                const response = await fetch(`https://rsg-movies.vercel.app/react/allmovies/all/?link=${decodeURIComponent(params.id)}`);
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

        fetchData();
    }, [params.id]);

    return (
        <main >
            <Header2></Header2>

            <div className="flex flex-col md:flex-row md:justify-between">
                <div className="md:w-9/12 p-4  border-b border-gray-200 dark:border-gray-700">
                    <MyLoader >
                        <main>
                            <p className="font-medium text-gray-700 dark:text-gray-400 underline underline-offset-4 text-center text-balance">
                                {data && data.links.map((movie, index) => (
                                    <Link to={`/${encodeURIComponent(movie.link)}`} key={index}>
                                        <span className='underline px-4'>{movie.name}</span>
                                    </Link>
                                ))}
                            </p>
                            {data && data.name ?
                                <h1 className="mb-4 mt-2 text-2xl font-bold text-black dark:text-white text-left">{data.name}</h1> : ""}

                            <div className="grid border-b border-gray-200 dark:border-gray-700 pb-4 grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-4 ">
                                {data && data.movies.map((movie, index) => (
                                    <div key={index} className="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  mx-auto overflow-hidden">
                                        <Link to={`${movie.link}`} >
                                            <img className="rounded-t-lg center h-52 w-40" src={movie.image} alt="img" />
                                            <div className="p-1 ">
                                                <h5 className="mb-2 h-12 text-1xl font-bold tracking-tight text-gray-900 dark:text-white line-clamp-2">{movie.name}</h5>
                                                <p className='text-xs font-medium text-slate-500 dark:text-gray-400'>{movie.year}</p>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                            {data && data.pagination.count ?

                                <nav aria-label="Page navigation example ">

                                    <ul className="flex items-center -space-x-px h-8 text-sm mt-4 justify-center ">
                                        <span className='m-4 text-gray-500 dark:text-gray-400'>{data.pagination.count}</span>
                                        {data.pagination.arrows.length > 1 ? <li>
                                            <Link to={`/${encodeURIComponent(data.pagination.arrows[0])}`} className="flex items-center justify-center px-3 h-8 ms-0 leading-tight text-gray-500 bg-white border border-e-0 border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                                                <span className="sr-only">Previous</span>
                                                <svg className="w-2.5 h-2.5 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 1 1 5l4 4" />
                                                </svg>
                                            </Link>
                                        </li> : ""}
                                        {data.pagination.pages.map((item, index) => (
                                            <li>
                                                <Link to={`/${encodeURIComponent(item.link)}`} className="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">{item.name}</Link>
                                            </li>

                                        ))}


                                        <li>
                                            <Link to={data.pagination.arrows.length > 1 ? `/${encodeURIComponent(data.pagination.arrows[1])}` : `/allmovies/${encodeURIComponent(data.pagination.arrows[0])}`} className="flex items-center justify-center px-3 h-8 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                                                <span className="sr-only">Next</span>
                                                <svg className="w-2.5 h-2.5 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                                                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4" />
                                                </svg>
                                            </Link>
                                        </li>

                                    </ul>
                                </nav> : ""

                            }
                        </main>
                    </MyLoader>
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
