import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom';
import { useAuth } from '../other/AuthContext';
import { toastWarning } from '../components/Notifications'
import MyLoader from '../MyLoader';
import debounce from 'lodash.debounce';

export default function Movierulz() {
  const { startLoad, stopLoad, loading } = useAuth();
  const query = useRef("");
  const [spinner, setSpinner] = useState(false);
  const [queryData, setQuery] = useState(JSON.parse(localStorage.getItem("query")) || "");
  const [queryMovies, setQueryMovies] = useState(JSON.parse(localStorage.getItem("querymovies")) || []);
  const [movies, setMovies] = useState(JSON.parse(localStorage.getItem("movierulz")) || []);

  const fetchData = async (apiUrl) => {
    startLoad();
    try {
      if (movies.length > 0 || queryData) stopLoad();
      const response = await fetch(apiUrl);
      const result = await response.json();
      if (response.status == 200) {
        setMovies(result.movies);
        localStorage.setItem("movierulz", JSON.stringify(result.movies));
      }
      else {
        toastWarning("Failed to get results")
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    stopLoad();
  };
  const searchFetch = async () => {
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/movierulz/search/${query.current.value}/`);
      const result = await response.json();
      if (response.status == 200) {
        setQueryMovies(result.movies);
        localStorage.setItem("querymovies", JSON.stringify(result.movies));
      }
      else {
        toastWarning("Failed to get results")
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setSpinner(false)
  };
  useEffect(() => {
    fetchData("https://rsg-movies.vercel.app/react/movierulz/");
  }, []);
  const handleSubmit = (event) => {
    event.preventDefault();
    setQuery(query.current.value);
    localStorage.setItem("query", JSON.stringify(query.current.value))
    setSpinner(true);
    if (query.current.value) {
      searchFetch();
    }
    else {
      localStorage.removeItem("querymovies");
    }
  }
  const handleChange = () => {
    localStorage.setItem("query", JSON.stringify(query.current.value))
    setSpinner(true);
    if (query.current.value) {
      searchFetch();
    }
    else {
      localStorage.removeItem("querymovies");
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

    <MyLoader>
      <main >
        <center>

          <form className="max-w-md mx-auto mb-4" onSubmit={handleSubmit}>
            <label className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                </svg>
              </div>
              <input type="search" id="default-search" ref={query} value={queryData} autoComplete="off" onChange={() => { setQuery(query.current.value); optimized() }} className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Search movie here..." />
              <button type="submit" className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Search</button>
            
          
          <div id="dropdown" className={`z-10 ${queryData ? "" : "hidden"} w-full  absolute bg-white divide-y divide-gray-100 rounded-lg shadow  dark:bg-gray-700`}>
            <div className='  '>
              <ul className="w-auto ">
                {spinner ?
                  <li className="py-2 bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">

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
                  {queryMovies.map((genre, index) => (
                    <Link to={`/movie${genre.link}`} key={index}>
                      <li  className="py-2 bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                          <div className="flex-shrink-0" >
                            <img className="w-8 h-auto rounded-full" src={`${genre.image}`} alt="Neil image" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                              {genre.name}
                            </p>
                        
                          </div>

                        </div>
                      </li></Link>
                  ))}
                </div>


                {
                  !spinner && !movies.length > 0 ?
                    <li className="py-2 bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                      <p className="text-sm text-center font-medium text-gray-900 truncate dark:text-white">
                        No results found
                      </p>
                    </li> : ""
                }
                <Link onClick={() => { setQuery(""); localStorage.removeItem("query"); localStorage.removeItem("querymovies") }} className="text-center block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white">Close</Link>


              </ul>
            </div>
          </div>

          </div>
          </form>
                <Link to="/allmovies">
      <h1 className="mb-4 lg:hidden text-2xl font-bold text-black dark:text-white flex items-center underline underline-offset-4">
  Allmovies
  <svg className="w-2.5 h-2.5 ml-3 mt-1.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
  </svg>
</h1>
      </Link>
          <div className="grid grid-cols-2 lg:grid-cols-6 md:grid-cols-4 gap-4 ">
            {movies.map((movie, index) => (
              <div key={index} className="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  mx-auto overflow-hidden">
                <Link to={`/movie${movie.link}`} >
                  <img className="rounded-t-lg center w-full h-3/4" src={`${movie.image}`} alt="img" />
                  <div className="p-1">
                    <h5 className="mb-2 text-1xl font-bold tracking-tight text-gray-900 dark:text-white line-clamp-3">{movie.name}</h5>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </center>
      </main>
    </MyLoader>
  )
}