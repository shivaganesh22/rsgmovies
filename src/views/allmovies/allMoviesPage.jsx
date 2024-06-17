import React,{useEffect,useState} from 'react';
import { useAuth } from '../other/AuthContext';
import { Link } from 'react-router-dom';
import Header2 from './Header2'
import Genres from './Genres';
import Years from './Years';
import TopMovies from './TopMovies';
import MyLoader from '../MyLoader';
import { toastWarning } from '../components/Notifications';
export default function AllMoviesPage() {
    const {startLoad,stopLoad,setNavbar,setYears,setGenres,setTopMovies}=useAuth();
    const [movies,setMovies]=useState(JSON.parse(localStorage.getItem("allmovies")) || []);
    useEffect(() => {
        const fetchData = async () => {
          startLoad();
          try {
            if(movies.length>0) stopLoad();
            const response = await fetch(`https://rsg-movies.vercel.app/react/allmovies/`);
            const result = await response.json();
            if(response.status==200){
              setMovies(result.movies);
              setNavbar(result.navbar)
              setGenres(result.genres)
              setYears(result.years)
              localStorage.setItem("allmovies", JSON.stringify(result.movies));
            }else{
              toastWarning("Failed to get results")
            }
           
          } catch (error) {
            console.error('Error fetching data:', error);
          }
          stopLoad();
          try {
            if(movies) stopLoad();
            const response = await fetch(`https://rsg-movies.vercel.app/react/imdb/`);
            const result = await response.json();
            if(response.status==200){
                setTopMovies(result.movies)
            }else{
             
            }
           
          } catch (error) {
            console.error('Error fetching data:', error);
          }
        };
    
        fetchData();
      },[] );
      
      
  return (
    <main>
        <Header2></Header2>
     <div className="flex flex-col md:flex-row md:justify-between">
      <div className="md:w-9/12 ">

      


        <MyLoader>
          <main>
          <Link to="/movierulz">
      <h1 className="mb-4 text-2xl font-bold text-black dark:text-white flex items-center">
  Movierulz
  <svg className="w-2.5 h-2.5 ml-3 mt-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4"/>
  </svg>
</h1>
      </Link>
        <div className="grid grid-cols-2 lg:grid-cols-5 md:grid-cols-3 gap-4 ">
            {movies.map((movie, index) => (
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
          </main>
        </MyLoader>
      </div>
      <div className="  md:w-1/4 p-4 border border-gray-200 dark:border-gray-700 ">
        <Genres></Genres>
        <TopMovies></TopMovies>
        <Years></Years>
       
      </div>
    </div>
   
  </main>
  )
}
