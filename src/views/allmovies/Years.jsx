import React, { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from '../other/AuthContext';
import MyLoader from '../MyLoader';

export default function Years() {

    const { years } = useAuth();
    const navigate = useNavigate();
    return (
        <>
            <h1 className="mb-4 text-2xl font-bold text-black dark:text-white text-left ">Years</h1>
            <div className='h-64 overflow-y-auto '>
                {/* <MyLoader>                 */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 md:grid-cols-2 gap-4">
                    {years.map((movie, index) => (
                        <div key={index} className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                            <Link to={`/${encodeURIComponent(movie.link)}`}>

                                <div className="p-1 hover:bg-gray-50 dark:hover:bg-gray-600">

                                    <h5 className="text-center text-sm text-gray-900 font-medium tracking-tight text-gray-900 dark:text-white uppercase">{movie.name}</h5>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
                {/* </MyLoader> */}

            </div>
        </>
    )
}
