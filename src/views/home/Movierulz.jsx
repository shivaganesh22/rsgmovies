import React, { useEffect,useState,useRef } from 'react'
import { Link } from 'react-router-dom';
import { useAuth } from '../other/AuthContext';
import MyLoader from '../MyLoader';


export default function Movierulz() {
  const {startLoad,stopLoad,loading}=useAuth();
  const query=useRef("");
   const [queryData,setQuery]=useState("");
  const [movies,setMovies] = useState(JSON.parse(localStorage.getItem("movierulz")) || []);
  const handleSubmit = (event) => {
    event.preventDefault();
    setQuery(query.current.value);
  }

  useEffect(() => {
    const fetchData = async (apiUrl) => {
      startLoad();
      try {
        if (movies.length>0) stopLoad();
        const response = await fetch(apiUrl);
        const result = await response.json();
        setMovies(result.movies);
        localStorage.setItem("movierulz", JSON.stringify(result.movies));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      stopLoad();
    };
    fetchData(queryData?`https://rsg-movies.vercel.app/api/movierulz/search/${queryData}`:"https://rsg-movies.vercel.app/api/movierulz/");
  }, [queryData]);
  return (
    
<MyLoader>
    <main >
      <center>
     {
      loading?"":
      <form className="max-w-md mx-auto">   
      <label  className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
      <div className="relative">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
              </svg>
          </div>
          <input type="search" id="default-search" ref={query} autoComplete="off" onChange={handleSubmit}  className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Search movie here..." required />
          <button type="submit" onClick={handleSubmit} className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Search</button>
      </div>
  </form>
     }

    

 <br />
<div className="grid grid-cols-2 lg:grid-cols-6 md:grid-cols-4 gap-4 ">
{ movies.map((movie,index) => (
<div key={index} className="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  mx-auto overflow-hidden">
    <Link to={`/movierulz/movie?link=${movie.link}`} >
        <img className="rounded-t-lg center" src={movie.image} alt="img" />
    <div className="p-1">
      <h5 className="mb-2 text-1xl font-bold tracking-tight text-gray-900 dark:text-white">{movie.name}</h5>
    </div>
    </Link>
</div>
)) }
</div>  
</center> 
    </main>
    </MyLoader>
  )
}
