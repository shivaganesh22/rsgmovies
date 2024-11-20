import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toastSuccess, toastWarning } from '../components/Notifications';
import { useAuth } from '../other/AuthContext';
import MyLoader from '../MyLoader';
export default function MovierulzMovie() {
  const urlSearchString = window.location.search;
  const params = useParams();
  const [data, setData] = useState("");
  const [links, setLinks] = useState([]);
  const [streams, setStreams] = useState([]);
  const [active, setActive] = useState(0);
  const [spinner, setSpinner] = useState(false);
  const [isShow, setShow] = useState(false);
  const [playerSrc, setPlayerSrc] = useState(null);
  const { startLoad, stopLoad } = useAuth();
  const fetchStreams = async (name) => {
    try {
      setSpinner(true)
      const response = await fetch(`https://rsg-movies.vercel.app/react/getstream/?link=${name}`);
      const result = await response.json();

      if (response.status == 200) {
        setStreams(result.movies);
        if (result.movies.length > 0)
          setPlayerSrc(result.movies[0]["link"])
        else
          setShow(true)
      }
      else {
        toastWarning("Failed to get streams")
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setSpinner(false)
  }
  const navigate = useNavigate();
  useEffect(() => {
    const fetchData = async () => {
      startLoad();
      try {
        // const response = await fetch(`https://rsg-movies.vercel.app/react/movierulz/movie/${params.id}/`);
        const response = await fetch(`https://rsg-movies.vercel.app/react/movierulz/movie/${params.id}/${params.slug}/`);
        const result = await response.json();
        if (response.status == 200) {

          setData(result.details);
          setLinks(result.links);
          // fetchStreams(result.details.name);
        }
        else {
          toastWarning("Failed to get results")
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      stopLoad();
    };

    fetchData();
  }, [params.id]);
  const addTorrent = async (link) => {
    startLoad();
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/addtorrent/?link=${link}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
      });
      const result = await response.json();
      if (response.status == 200) {
        if (result.result == true) {
          toastSuccess("Torrent Added");
          navigate('/files');
        }
        else {
          toastWarning(result.result)
        }
      }
      else {
        toastWarning(result["error"])
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    }
    stopLoad();
  }
  return (
    <MyLoader>
      <main>
        <center>

          <section className="flex justify-around flex-wrap ">
            <div className="max-w-sm">
              {data &&<img className="rounded lg:w-72 lg:mt-5 md:mt-14 md:w-56" src={`${data.image}`} alt={data.name} />}
            </div>
            <div className="max-w-2xl text-gray-700 text-lg dark:text-white">
              <h1 className="lg:text-4xl md:text-3xl text-2xl md:text-left font-bold my-3 text-center lg:text-left">{data.name}</h1>
              <div className='mt-4 text-left' dangerouslySetInnerHTML={{ __html: data.inf }} />
              <div className='mt-4 text-left' dangerouslySetInnerHTML={{ __html: data.desc }} />
            </div>
          </section>
          {data && 
                    <a href={data.movie_link} target='_blank'>
                        <button className="w-full text-xl mt-2 text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-lg px-5 py-2.5 mr-2 mb-2 font-medium">Watch Online (Use Adblocker)</button>
                    </a>         
          }
          {/* {data && <div className="w-full bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 mt-2">
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
            {playerSrc ? <iframe className='w-full h-64 md:h-80' height="315" src={`https://swdyu.com/e/${playerSrc}`} onLoad={() => setSpinner(false)} frameBorder="1" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe> : ""}
          </div>
          } */}
          {/* {isShow ? <h5 className="my-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white text-left uppercase">Streams</h5> : ""}
          {isShow ? <p className="font-medium text-gray-700 dark:text-gray-400 text-left text-sm ">Stream links are in progress and will be added soon.</p> : ""}


          <div className='max-h-64 overflow-y-auto '>
            {streams.length > 0 ? <h5 className="my-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white text-left uppercase">Streams</h5> : ""}
            <ul className=" grid grid-cols-1 gap-2 md:grid-cols-2 ">
              {streams.map((genre, index) => (


                <li key={index} className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-600 w-full w-sm  border border-gray-200 rounded-lg shadow  dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center ${active == index ? "bg-gray-200 dark:bg-gray-600" : "bg-white dark:bg-gray-800"} `}>
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="flex-1 min-w-0">
                      <Link onClick={() => { setSpinner(true); setActive(index); setPlayerSrc(genre.link) }}>
                        <p className={`text-sm font-medium text-gray-900  dark:text-white uppercase`}>
                          {genre.name}
                        </p>
                      </Link>
                    </div>
                    <div className="inline-flex items-center   text-base font-semibold text-gray-900 dark:text-white pr-1">
                      <a href={`https://swdyu.com/f/${(genre.link)}`} target='_blank'>
                        <i className="fa fa-download text-black dark:text-white" aria-hidden="true"></i>
                      </a>
                    </div>
                  </div>
                </li>
              ))}

            </ul>
          </div> */}



          {links.length > 0 ? <h5 className="mt-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white text-left uppercase">Torrents</h5> : ""}
          <div className="grid grid-cols-2 p-4 lg:grid-cols-5 md:grid-cols-4 gap-5 my-2  md:gap-4 md:p-0 lg:p-0 lg:gap-4 ">
            {links.map((movie, index) => (
              <div key={index} className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                <Link onClick={() => { addTorrent(movie.link) }}>

                  <div className="p-1">
                    <i className="fa fa-upload text-black dark:text-white" aria-hidden="true"></i>
                    <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{movie.name}</h5>
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
