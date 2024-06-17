import React, { useRef, useState, useEffect } from 'react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { Link } from 'react-router-dom';
import { faVolumeXmark, faMusic } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from './other/AuthContext';
import MyLoader from './MyLoader';
import { toastWarning } from './components/Notifications';
export default function Y2Mate() {
  const query = useRef("");
  const [queryData, setQuery] = useState(JSON.parse(localStorage.getItem("y2matequery")) || "");
  const [toggle, setToggle] = useState(false);
  const {startLoad,stopLoad}=useAuth();
  const [data, setData] = useState(JSON.parse(localStorage.getItem("y2mate")) || null);

  const [isShow, setShow] = useState(1);

  const handleSubmit = (event) => {
    event.preventDefault();
    setQuery(query.current.value);
  }
  const downloadVideo = async (link) => {
    startLoad();
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/y2matedownload/?link=${link}&vid=${data.vid}`);
      if(response.status==200){
        const result = await response.json();
        console.log(result.dlink);
        // window.location.href=result.dlink;
        
        
      }else{
        toastWarning("Failed to get results")
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    }
    stopLoad();
  };
  useEffect(() => {
    const fetchData = async () => {
      startLoad();
      try {
        if(data) stopLoad();
        const response = await fetch(`https://rsg-movies.vercel.app/react/y2mate/?link=${queryData}`);
        if(response.status==200){
          const result = await response.json();
          console.log(result);
          setData(result);
          localStorage.setItem("y2mate", JSON.stringify(result));
          
        }else{
          toastWarning("Failed to get results")
        }

      } catch (error) {
        console.error('Error fetching data:', error);
      }
      stopLoad();
    };

    localStorage.setItem("y2matequery", JSON.stringify(queryData));
    if (queryData) {
      fetchData();}
      else{
        setData(null);
        localStorage.removeItem('y2mate');
      }
  }, [queryData]);


  return (
    <main>
      <center>

     
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />

      <form className="max-w-md mx-auto">
        <label className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
        <div className="relative">
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
            </svg>
          </div>
          <input type="search" id="default-search" value={queryData} ref={query} autoComplete="off" onChange={handleSubmit} className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Enter Youtube Link..." required />
          <button type="submit" onClick={handleSubmit} className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Search</button>
        </div>
      </form>


     <MyLoader>
      <main>
     {data&&<><div className="p-1">
        <h5 className="mb-2 text-1xl font-bold tracking-tight text-gray-900 dark:text-white">{data && data.title }</h5>
      </div>
      <img className="h-auto w-64 lg:w-80 rounded p-2 mx-auto" src={data&&`https://i.ytimg.com/vi/${data.vid}/0.jpg`} alt="Image" />
      <div className='flex justify-center items-center'>
                    <div className="grid grid-cols-3  gap-0 place-items-center ">
                        <div className={`m-2 hover:bg-gray-100 dark:hover:bg-gray-600 ${isShow==1 ? "bg-gray-200 dark:bg-gray-600" : "bg-white dark:bg-gray-800"} border border-gray-200 rounded-lg shadow  dark:border-gray-700 w-20 md:w-40  max-h-128  overflow-hidden`}>
                            <Link onClick={(e) => { e.preventDefault(); setShow(1) }} >

                                <div className="p-1 text-black dark:text-white ">
                                    Video
                                </div>
                            </Link>
                        </div>
                        <div className={`m-2 hover:bg-gray-100 dark:hover:bg-gray-600 ${isShow==2 ? "bg-gray-200 dark:bg-gray-600" : "bg-white dark:bg-gray-800"}   border border-gray-200 rounded-lg shadow  dark:border-gray-700 w-20 md:w-40 max-h-128  overflow-hidden`}>
                            <Link onClick={(e) => { e.preventDefault(); setShow(2); }}>

                                <div className="p-1 text-black dark:text-white">
                                    Audio
                                </div>
                            </Link>
                        </div>
                        <div className={`m-2 hover:bg-gray-100 dark:hover:bg-gray-600 ${isShow==3 ? "bg-gray-200 dark:bg-gray-600" : "bg-white dark:bg-gray-800"}   border border-gray-200 rounded-lg shadow  dark:border-gray-700 w-20 md:w-40 max-h-128  overflow-hidden`}>
                            <Link onClick={(e) => { e.preventDefault(); setShow(3); }}>

                                <div className="p-1 text-black dark:text-white">
                                    Other
                                </div>
                            </Link>
                        </div>
                    </div>
                </div></>}
      {data?.mess&&<h5 className="mt-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white text-center">{data.mess}</h5>}
      <div className="grid grid-cols-2 p-4 lg:grid-cols-5 md:grid-cols-4 gap-5  md:gap-4 md:p-0 lg:p-0 lg:gap-4 ">
        {isShow==1?
        data?.links?.mp4&& Object.entries(data.links.mp4).map(([index, movie]) => (
          <div key={index} className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
          <Link  onClick={(e)=>{e.preventDefault();downloadVideo(movie.k)}}>

            <div className="p-1" >


              <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{movie.q}</h5>
              <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase"><i className="fa fa-video-camera dark:text-white" aria-hidden="true"></i> {movie.f}</h5>
              
              <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{movie.size}</h5>
            </div>
          </Link>
        </div>
        ))
        :""}
        {isShow==2 ?
        data?.links?.mp3&& Object.entries(!data.mess&&data.links.mp3).map(([index, movie]) => (
          <div key={index} className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
          <a href={`${movie.url}`}  >

            <div className="p-1">


              <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{movie.q}</h5>

              <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase"> <FontAwesomeIcon icon={faMusic}></FontAwesomeIcon> {movie.f}</h5>

              <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{movie.size} </h5>
            </div>
          </a>
        </div>
        ))
          
        :""}
          {
            isShow==3?
            data?.links?.other&&Object.entries(!data.mess&&data.links.other).map(([index, movie]) => (
              <div key={index} className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
              <Link to={`${movie.url}`} target="_blank">

                <div className="p-1" >


                  <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase" dangerouslySetInnerHTML={{ __html: movie.q_text }}></h5>
          
                  <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{movie.size} </h5>
                </div>
              </Link>
            </div>
            ))
           
            :""}
          

      </div>
      </main>
      </MyLoader>
     
      </center>

    </main>
  )
}
