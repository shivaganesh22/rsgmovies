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
export default function AllMoviesMovie() {
  const { startLoad, stopLoad } = useAuth();
  const [data, setData] = useState("");
  const [spinner, setSpinner] = useState(true);
  const [playerSrc, setPlayerSrc] = useState("");
  const [active, setActive] = useState("1");
  const params = useParams();
  useEffect(() => {
    const fetchData = async () => {
      startLoad();
      try {
        const response = await fetch(`https://rsg-movies.vercel.app/react/allmovies/movies/${params.id}`);
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
    fetchData()
    setSpinner(true);

  }, [params.id]);
const fetchPlayer=async(item)=>{
  setSpinner(true);
  setActive(item.num)
  try {
    const response = await fetch(`https://rsg-movies.vercel.app/react/allmovies/player/`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
        },
      body: JSON.stringify({
       "id":item.id,
       "type":item.type,
       "num":item.num
      }),
    });
    const result = await response.json();
    if (response.status == 200) {
      setPlayerSrc(result.link)
     
    }
    else {
      toastWarning("Failed to get results")
    }

  } catch (error) {
    console.error('Error fetching data:', error);
  }
  // setSpinner(false)
}
  return (
    <main >
      <Header2></Header2>

      <div className="flex flex-col md:flex-row md:justify-between">
        <div className="md:w-9/12  border-b border-gray-200 dark:border-gray-700">



          <MyLoader >
            <div className='header2'>{data ? <>
              <section className="flex justify-around flex-wrap py-5">
                <center>
                  <img className="rounded w-1/2 lg:mt-5 md:mt-14 md:h-56 md:w-auto" src={data.image} alt={data.name} />
                </center>
                <div className="max-w-2xl   text-gray-700 text-lg dark:text-white">
                  <h1 className="lg:text-4xl md:text-3xl text-2xl md:text-left font-bold my-3 text-center lg:text-left">{data.name}</h1>
                  <div className='my-4 text-left' >
                    <p className='text-xs font-medium text-slate-500 dark:text-gray-400'>{data.extra}</p>
                   
                    <p className="py-2 font-medium text-gray-700 dark:text-gray-400 text-left text-xs">
                                {data.genre.map((movie, index) => (
                                    <><Link to={`/${encodeURIComponent(movie.link)}`}  key={index}>   <span className='underline underline-offset-4'> {movie.name}</span>  <>&nbsp;&nbsp;</> </Link></>
                                ))}
                            </p>
                    <p className='text-sm text-left text-slate-500 dark:text-gray-400'>{data.description}</p>
                  </div>
                </div>

              </section>
              <center>

                <div className="w-full bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 ">

                  {spinner ?

                    <center>
                      <svg aria-hidden="true" className="w-8 h-8 text-center text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                      </svg>
                      <span className="sr-only">Loading...</span>

                    </center>
                    : ""
                  }
                  <iframe className='w-full h-64 md:h-80' height="315" src={playerSrc ? playerSrc : data.player} onLoad={() => setSpinner(false)} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
                  </div>
                  <div class="grid grid-cols-2 pt-2 md:grid-cols-2 gap-5 ">
                    <div className='max-h-64 overflow-y-auto '>
                    <h5 className="mt-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white text-left uppercase">Streams</h5>
                      <ul class="  dark:border-gray-700 max-w-md divide-y divide-gray-200 dark:divide-gray-700">
                      {data.players.map((genre, index) => (
                    <Link onClick={()=>fetchPlayer(genre)}>
                    
                      <li class={`p-2  my-2 hover:bg-gray-100 dark:hover:bg-gray-600 w-full w-sm  border border-gray-200 rounded-lg shadow  dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center ${active==genre.num?"bg-gray-200 dark:bg-gray-600":"bg-white dark:bg-gray-800" }`}>
                        <div class="flex items-center space-x-4 rtl:space-x-reverse">
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                              {genre.name}
                            </p>
                           
                          </div>

                        </div>
                      </li></Link>
                  ))}

                      </ul>
                    </div>
                    <div className='max-h-64 overflow-y-auto '>
                    <h5 className="mt-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase text-left">Downloads</h5>
                      <ul class="max-w-md dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                      {data.download.map((genre, index) => (
                    <a href={`${(genre.link)}`} target='_blank'>
                      <li class="p-2 bg-white my-2 hover:bg-gray-100 dark:hover:bg-gray-600 w-full w-sm  border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center">
                        <div class="flex items-center space-x-4 rtl:space-x-reverse">
                          
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                              {genre.name}
                            </p>
                           

                          </div>

                        </div>
                      </li></a>
                  ))}

                      </ul>
                    </div>
                  </div>
                
              </center>

              <div className='border-b pt-4 border-gray-200 dark:border-gray-700'></div>
              <h5 className="mt-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">Director</h5>
              <ul class="grid grid-cols-1 pt-2 md:grid-cols-2 gap-5 ">
                <Link to={`/${encodeURIComponent(data.director.link)}`}>
                  <li class="p-2 bg-white  hover:bg-gray-100 dark:hover:bg-gray-600 w-full w-sm  border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center">
                    <div class="flex items-center space-x-4 rtl:space-x-reverse">
                      <div class="flex-shrink-0" >
                        <img class=" w-8 h-auto -8 rounded-full" src={data.director.image} alt="Neil image" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                          {data.director.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                          {data.director.description}
                        </p>

                      </div>

                    </div>
                  </li></Link>
              </ul>
              <h5 className="mt-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">Cast</h5>
              <div className='max-h-64 overflow-y-auto '>
                <ul class="grid grid-cols-1 pt-2 md:grid-cols-2 gap-5 ">

                  {data.actors.map((genre, index) => (
                    <Link to={`/${encodeURIComponent(genre.link)}`}>
                      <li class="p-2 bg-white  hover:bg-gray-100 dark:hover:bg-gray-600 w-full w-sm  border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center">
                        <div class="flex items-center space-x-4 rtl:space-x-reverse">
                          <div class="flex-shrink-0" >
                            <img class=" w-8 h-auto -8 rounded-full" src={genre.image} alt="Neil image" />
                          </div>
                          <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                              {genre.name}
                            </p>
                            <p className="text-sm text-gray-500 truncate dark:text-gray-400">
                              {genre.description}
                            </p>

                          </div>

                        </div>
                      </li></Link>
                  ))}

                </ul>
              </div>
              <div className='border-b pt-4 border-gray-200 dark:border-gray-700'></div>
              <div className="flex overflow-x-auto">
                {data.images.map((movie, index) => (
                  <div key={index} className="flex-none w-64 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 mr-4 my-4">
                    <img className="rounded-t-lg h-40 w-auto" src={movie} alt="img" />
                  </div>
                ))}
              </div>
              <div className='max-h-64 overflow-y-auto '>
                <ul class="grid grid-cols-1  md:grid-cols-2 gap-5 ">
                  {data.custom.map((genre, index) => (

                    <li class="p-2 bg-white  hover:bg-gray-100 dark:hover:bg-gray-600 w-full w-sm  border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center">
                      <div class="flex items-center space-x-4">

                        <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                          {genre.name}:
                        </p>

                        <div className="text-base  text-gray-900 dark:text-white" dangerouslySetInnerHTML={{ __html: genre.description }} />

                      </div>
                    </li>
                  ))}

                </ul>
              </div>
              <div className='border-b pt-4 border-gray-200 dark:border-gray-700'></div>
              <h1 className=" text-2xl font-bold text-black dark:text-white text-left">Similar Movies</h1>
              <div className="flex overflow-x-auto">
                {data.movies.map((movie, index) => (
                  <div key={index} className="flex-none  bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 mr-4 my-4">
                    <Link to={`${movie.link}`}>
                      <img className="rounded-t-lg h-40 w-auto" src={movie.image} alt="img" />

                    </Link>
                  </div>
                ))}
              </div>
            </> : ""} </div></MyLoader>

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
