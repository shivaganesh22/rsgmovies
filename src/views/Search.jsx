import React, { useEffect, useState,useRef } from 'react'
import { Link } from 'react-router-dom'


export default function Search() {
    const query = useRef("");
    const [queryData, setQuery] = useState("");
    const [page, setPage] = useState(1);

    const [data, setData] = useState("");
    const [links, setLinks] = useState([]);

    const handleSubmit = (event) => {
        event.preventDefault();
        setQuery(query.current.value);
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`https://rsg-movies.vercel.app/api/search/?q=${queryData}&page=${page}`);
                const result = await response.json();
                setData(result.name);
                setLinks(result.links);

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        if (queryData) fetchData()
    }, [queryData]);
    return (
        <main>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"/>
            <form className="max-w-md mx-auto">
                <label className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
                <div className="relative">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                        </svg>
                    </div>
                    <input type="search" id="default-search" ref={query} autoComplete="off" onChange={handleSubmit} className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Search Anything here..." required />
                    <button type="submit" onClick={handleSubmit} className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Search</button>
                </div>
            </form>
            <br />
            <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{data?data:""}</h5>
            <div className="grid grid-cols-1 p-4 lg:grid-cols-2 md:grid-cols-2 gap-5  md:gap-4 md:p-0 lg:p-0 lg:gap-4 ">
                {links.map((movie, index) => (
                    <div key={index} className="w-sm  border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center">
                        <Link href={`/movierulz/movie?link=${movie.link}`}>
                            <div className="p-1">
                                <i className="fa fa-upload text-black dark:text-white" aria-hidden="true"></i>
                                <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{movie.name}</h5>
                                <h5 className="mb-2 text-1xl text-black  tracking-tight text-gray-900 dark:text-white uppercase">{movie.date}  {movie.size}</h5>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </main>
    )
}
