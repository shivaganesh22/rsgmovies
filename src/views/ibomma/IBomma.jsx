import React ,{useState,useEffect} from 'react'
import { Link } from 'react-router-dom';
export default function IBomma() {
    const [movies,setMovies] = useState(JSON.parse(localStorage.getItem("ibomma")) || []);
    useEffect(() => {
      const fetchData = async () => {
        try {
          const response = await fetch(`https://rsg-movies.vercel.app/api/ibomma/`);
          const result = await response.json();
          setMovies(result.movies);
          localStorage.setItem("ibomma", JSON.stringify(result.movies));
          
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
  
      fetchData();
    }, );
    return (
      <main>
        <center>
 <div className=''>
 <div className="grid grid-cols-2  p-4 lg:grid-cols-6 md:grid-cols-4 gap-5  md:gap-4 md:p-0 lg:p-0 lg:gap-4 ">
  { movies.map((movie,index) => (
  <div key={index} className="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
      <Link to={`/ibomma/movie?link=${movie.link}`}>
          <img className="rounded-t-lg center" src={movie.image} alt="img" />
      <div className="p-1">
        <h5 className="mb-2 text-1xl font-bold tracking-tight text-gray-900 dark:text-white">{movie.name}</h5>
      </div>
      </Link>
  </div>
  )) }
  </div>
 </div>
  </center>
      </main>
    )
}
