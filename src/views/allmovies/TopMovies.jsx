import React, { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from '../other/AuthContext';
import MyLoader from '../MyLoader';


export default function TopMovies() {

    const { topmovies } = useAuth();
    const navigate = useNavigate();
    return (
        <>
            <h1 className="mb-4 text-2xl font-bold text-black dark:text-white text-left ">Top Movies</h1>
            <div className='h-64 overflow-y-auto '>
                {/* <MyLoader> */}
                <ul class="max-w-md divide-y divide-gray-200 dark:divide-gray-700">
                
                    {topmovies.map((genre, index) => (

                        <Link to={`/allmovies${genre.link}`}><li class="py-2 bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                            <div class="flex items-center space-x-4 rtl:space-x-reverse">
                                <div class="flex-shrink-0" >
                                    <img class="w-8 h-auto rounded-full" src={genre.image} alt="Neil image" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                                        {genre.name}
                                    </p>

                                </div>
                                <div class="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                                    {genre.rating}
                                </div>
                            </div>
                        </li></Link>




                    ))}
                    
                </ul>
                {/* </MyLoader> */}
            </div>
        </>
    )
}
