import React, { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from '../other/AuthContext';
import MyLoader from '../MyLoader';

export default function Genres() {

    const { genres } = useAuth();
    const navigate = useNavigate();
    return (
        <div className='hidden md:block'>
            <h1 className="mb-4 text-2xl font-bold text-black dark:text-white text-left ">Genres</h1>
            <div className='h-64 overflow-y-auto '>
                {/* <MyLoader> */}
                <ul className=" max-w-md divide-y divide-gray-200 dark:divide-gray-700 ">
                    {genres.map((genre, index) => (
                        // <li key={index} className='dark:text-gray-400 font-medium border-b dark:border-gray-700' onClick={()=>{navigate(`/allmovies/${encodeURIComponent(genre.link)}`)}}>{genre.name} 
                        // <span className='float-right'>{genre.count}</span>
                        // </li>
                        <Link to={`/allmovies/${encodeURIComponent(genre.link)}`}>  
                        <li className="py-2 bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                            <div className="flex items-center space-x-4 rtl:space-x-reverse">

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                                        {genre.name}
                                    </p>

                                </div>
                                <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                                    {genre.count}
                                </div>
                            </div>
                        </li></Link>
                    ))}
                </ul>
                {/* </MyLoader> */}
            </div>
        </div>
    )
}
