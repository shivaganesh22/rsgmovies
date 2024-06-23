import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Link, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from '../other/AuthContext';
import { toastWarning } from '../components/Notifications';
import { Dropdown } from "flowbite-react";

export default function Header2() {
    const [hidden, setHidden] = useState(true);
    const { navbar, startLoad, stopLoad, topmovies,genres,years } = useAuth();
    const [movies, setMovies] = useState(JSON.parse(localStorage.getItem("allquerymovies")) || [])
    const [spinner, setSpinner] = useState(false);
    const navigate = useNavigate();
    const query = useRef("");
    const query1 = useRef("");
    const [queryData, setQuery] = useState(JSON.parse(localStorage.getItem("allquery")) || "");
    const fetchData = async () => {

        try {
            const response = await fetch(`https://rsg-movies.vercel.app/react/allmovies/search/?query=${query.current.value}`);
            const result = await response.json();
            if (response.status == 200) {
                setMovies(result.movies);
                localStorage.setItem("allquerymovies", JSON.stringify(result.movies));

            }
            else {
                toastWarning("Failed to get results")
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setSpinner(false);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setQuery(query.current.value);
        localStorage.setItem("allquery", JSON.stringify(query.current.value))
        setSpinner(true);
        if (query.current.value) {
            fetchData()
        }
        else {
            localStorage.removeItem('allquerymovies')
        }

    }
    const handleChange = () => {
        localStorage.setItem("allquery", JSON.stringify(query.current.value))
        setSpinner(true);
        if (query.current.value) {
            fetchData()
        }
        else {
            localStorage.removeItem('allquerymovies')
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

    return (
        <div>
            <nav className="bg-white border-2 rounded-2xl border-gray-200 px-2 sm:px-4 dark:bg-gray-900 dark:border-b-1 dark:border-gray-900">
                <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-2">
                    <Link to="/" className="flex items-center space-x-3 rtl:space-x-reverse">
                        <img src="https://flowbite.com/docs/images/logo.svg" className="h-8" alt="Logo" />
                        <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">AllMovies</span>
                    </Link>
                    <div className="flex lg:order-2">
                        <button type="button" onClick={() => { setHidden(!hidden) }} data-collapse-toggle="navbar-search" aria-controls="navbar-search" aria-expanded="false" className="md:hidden text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-2.5 me-1">
                            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                            </svg>
                            <span className="sr-only">Search</span>
                        </button>
                        <div className="relative hidden lg:block">
                            <form onSubmit={handleSubmit}>

                                <input type="text" id="search-navbar" ref={query} value={queryData} onChange={() => { setQuery(query.current.value); optimized() }} className="block w-full p-2 pl-2  text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Search..." autoComplete='off' />
                                {/* <div className='absolute inset-y-0 end-0 flex items-center ps-3 pointer-events-none'>
                            <button type="submit" onClick={()=>{alert("")}} className="text-white  end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Search</button>
                            </div> */}
                                <div className="absolute inset-y-0 end-2 flex items-center ps-3 ">
                                    <button type='submit'>
                                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                                        </svg>
                                        <span className="sr-only">Search icon</span>
                                    </button>
                                </div>
                            </form>
                            <div id="dropdown" className={`z-10 ${queryData ? "" : "hidden"} end-0 absolute bg-white divide-y divide-gray-100 rounded-lg shadow w-full dark:bg-gray-700`}>
                                <div className='  '>
                                    <ul className="w-auto ">
                                        {spinner ?
                                            <li className="py-2 bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">

                                                <center>
                                                    <svg aria-hidden="true" className="w-8 h-8 text-center text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                                                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                                                    </svg>
                                                    <span className="sr-only">Loading...</span>

                                                </center>
                                            </li> : ""
                                        }
                                        <div className='max-h-64 overflow-y-auto'>
                                            {movies.map((genre, index) => (
                                                <Link to={`${genre.link}`}>
                                                    <li className="py-2 bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                                                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                                                            <div className="flex-shrink-0" >
                                                                <img className="w-8 h-auto rounded-full" src={genre.image} alt="Neil image" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                                                                    {genre.name}
                                                                </p>
                                                                <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                                                                    {genre.year}
                                                                </p>

                                                            </div>

                                                        </div>
                                                    </li></Link>
                                            ))}
                                        </div>


                                        {
                                            !spinner && !movies.length > 0 ?
                                                <li className="py-2 bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                                                    <p className="text-sm text-center font-medium text-gray-900 truncate dark:text-white">
                                                        No results found
                                                    </p>
                                                </li> : ""
                                        }
                                        <Link onClick={() => { setQuery(""); localStorage.removeItem("allquery"); localStorage.removeItem("allquerymovies") }} className="text-center border-t dark:border-gray-700 border-gray-200 block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white">Close</Link>


                                    </ul>
                                </div>
                            </div>

                        </div>
                        <button data-collapse-toggle="navbar-search" onClick={() => { setHidden(!hidden) }} type="button" className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg lg:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600" aria-controls="navbar-search" aria-expanded="false">
                            <span className="sr-only">Open main menu</span>
                            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1h15M1 7h15M1 13h15" />
                            </svg>
                        </button>
                    </div>
                    <div className={`items-center justify-between ${hidden ? "hidden" : ""} w-full lg:flex lg:w-auto lg:order-1`} id="navbar-search">
                        <div className="relative mt-3 lg:hidden">
                            <form onSubmit={handleSubmit}>

                                <input type="text" id="search-navbar" ref={query1} value={queryData} onChange={() => { setQuery(query1.current.value); optimized() }} className="block w-full p-2 pl-2  text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Search..." autoComplete='off' />

                                <div className="absolute inset-y-0 end-2 flex items-center ps-3 ">
                                    <button type='submit'>
                                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                                        </svg>
                                        <span className="sr-only">Search icon</span>
                                    </button>
                                </div>
                            </form>
                            <div id="dropdown" className={`z-10 ${queryData ? "" : "hidden"} end-0 absolute bg-white divide-y divide-gray-100 rounded-lg shadow w-full dark:bg-gray-700`}>
                                <div className='  '>
                                    <ul className="w-auto ">
                                        {spinner ?
                                            <li className="py-2 bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">

                                                <center>
                                                    <svg aria-hidden="true" className="w-8 h-8 text-center text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                                                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                                                    </svg>
                                                    <span className="sr-only">Loading...</span>

                                                </center>
                                            </li> : ""
                                        }
                                        <div className='max-h-64 overflow-y-auto'>
                                            {movies.map((genre, index) => (
                                                <Link onClick={(e)=>{e.preventDefault();navigate(genre.link);setHidden(!hidden);}} key={index} >
                                                    <li className="py-2 bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                                                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                                                            <div className="flex-shrink-0" >
                                                                <img className="w-8 h-auto rounded-full" src={genre.image} alt="Neil image" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                                                                    {genre.name}
                                                                </p>
                                                                <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                                                                    {genre.year}
                                                                </p>

                                                            </div>

                                                        </div>
                                                    </li></Link>
                                            ))}
                                        </div>


                                        {
                                            !spinner && !movies.length > 0 ?
                                                <li className="py-2 bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                                                    <p className="text-sm text-center font-medium text-gray-900 truncate dark:text-white">
                                                        No results found
                                                    </p>
                                                </li> : ""
                                        }
                                        <Link onClick={() => { setQuery(""); localStorage.removeItem("allquery"); localStorage.removeItem("allquerymovies"); setHidden(!hidden); }} className="text-center border-t dark:border-gray-700 border-gray-200 block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white">Close</Link>


                                    </ul>
                                </div>
                            </div>
                        </div>
                        <ul className="flex flex-col font-medium p-4 lg:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 lg:space-x-8 rtl:space-x-reverse lg:flex-row lg:mt-0 lg:border-0 lg:bg-white dark:bg-gray-800 lg:dark:bg-gray-900 dark:border-gray-700">
                            {navbar.map((movie, index) => (
                                movie.subitems.length == 0 ?
                                    <li key={index}>
                                        <NavLink to={`/${encodeURIComponent(movie.link)}`} className="block py-2 px-3 lg:p-0 text-gray-900 rounded hover:bg-gray-100 lg:hover:bg-transparent lg:hover:text-blue-700 lg:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700">{movie.name}</NavLink>
                                    </li>
                                    : <li className=' block py-2 px-3 lg:p-0 text-gray-900 rounded hover:bg-gray-100 lg:hover:bg-transparent lg:hover:text-blue-700 lg:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700'>
                                        <Dropdown
                                            arrowIcon={true}
                                            inline
                                            label={
                                                <label >{movie.name}</label>
                                            }
                                        >   <div className='max-h-64 overflow-y-auto '>
                                            {movie.link ?
                                                <Dropdown.Header className='hover:bg-gray-100'>
                                                    <Link onClick={(e) => { e.preventDefault();navigate(`/${encodeURIComponent(movie.link)}`);setHidden(!hidden) }} className="dark:text-white">{movie.name}</Link>
                                                </Dropdown.Header> : ""}
                                            {movie.subitems.map((sub, index) => (
                                                <Dropdown.Item key={index} className='dark:text-white' onClick={() => { navigate(`/${encodeURIComponent(sub.link)}`);setHidden(!hidden) }}>{sub.name}</Dropdown.Item>

                                            ))}</div>

                                        </Dropdown>
                                    </li>


                            ))}
                            <li className='md:hidden block py-2 px-3 lg:p-0 text-gray-900 rounded hover:bg-gray-100 lg:hover:bg-transparent lg:hover:text-blue-700 lg:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700'>
                                        <Dropdown
                                            arrowIcon={true}
                                            inline
                                            label={
                                                <label >Genres</label>
                                            }
                                        >   <div className='max-h-64 overflow-y-auto '>
                                            
                                            {genres.map((sub, index) => (
                                                <Dropdown.Item key={index} className='dark:text-white' onClick={() => { navigate(`/${encodeURIComponent(sub.link)}`);setHidden(!hidden) }}>{sub.name}</Dropdown.Item>

                                            ))}</div>

                                        </Dropdown>
                                    </li>
                            <li className='md:hidden block py-2 px-3 lg:p-0 text-gray-900 rounded hover:bg-gray-100 lg:hover:bg-transparent lg:hover:text-blue-700 lg:dark:hover:text-blue-500 dark:text-white dark:hover:bg-gray-700 dark:hover:text-white lg:dark:hover:bg-transparent dark:border-gray-700'>
                                        <Dropdown
                                            arrowIcon={true}
                                            inline
                                            label={
                                                <label >Years</label>
                                            }
                                        >   <div className='max-h-64 overflow-y-auto '>
                                            
                                            {years.map((sub, index) => (
                                                <Dropdown.Item key={index} className='dark:text-white' onClick={() => { navigate(`/${encodeURIComponent(sub.link)}`);setHidden(!hidden) }}>{sub.name}</Dropdown.Item>

                                            ))}</div>

                                        </Dropdown>
                                    </li>
                        </ul>
                    </div>
                </div>
            </nav>

        </div>
    )
}
