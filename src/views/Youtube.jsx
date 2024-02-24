import React,{useRef,useState,useEffect} from 'react'
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome"
import { faVolumeXmark,faMusic} from '@fortawesome/free-solid-svg-icons'
export default function Youtube() {
   const query=useRef("");
   const [queryData,setQuery]=useState("");
   const [toggle,setToggle]=useState(false);
   const [data,setData]=useState(null);
   const [videos,setVideos]=useState([]);
   const [audios,setAudios]=useState([]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setQuery(query.current.value);
  }
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`https://rsg-movies.vercel.app/api/youtube/?link=${queryData}`);
        const result = await response.json();
        setData(result);
        setVideos(result.videos);
        setAudios(result.audio);
       
        
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

   if (queryData) fetchData();
  }, [queryData]);
  

  return (
    <main>
    
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"/>
      
<form className="max-w-md mx-auto">   
    <label  className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
    <div className="relative">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
            </svg>
        </div>
        <input type="search" id="default-search" ref={query} autoComplete="off" onChange={handleSubmit}  className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Enter Youtube Link..." required />
        <button type="submit" onClick={handleSubmit} className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Search</button>
    </div>
</form>

<br/>
<label className="inline-flex items-center cursor-pointer">
  <input type="checkbox" value="" className="sr-only peer" onChange={()=>{setToggle(!toggle)}}/>
  <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
  <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">{toggle?"Audio":"Video"}</span>
</label>
<br/>
<div className="p-1">
      <h5 className="mb-2 text-1xl font-bold tracking-tight text-gray-900 dark:text-white">{data?data.title:""}</h5>
    </div>
<img className="h-auto w-64 lg:w-80 rounded p-4 mx-auto" src={data?data.thumb:""} alt="" />
<div className="grid grid-cols-2 p-4 lg:grid-cols-5 md:grid-cols-4 gap-5  md:gap-4 md:p-0 lg:p-0 lg:gap-4 ">
  {toggle?
  audios.map((movie,index) => (
    <div key={index} className="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
        <a href={`${movie.url}`}>
            
        <div className="p-1">
        
            
            <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{movie.resolution}</h5>
          
             <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase"> <FontAwesomeIcon icon={faMusic}></FontAwesomeIcon> {movie.codec}</h5>
          
             <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{movie.size.toFixed(2)} MB</h5>
          </div>
        </a>
    </div>
    ))
    :
    videos.map((movie,index) => (
      <div key={index} className="max-w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
          <a href={`${movie.url}`}>
              
          <div className="p-1">
        
            
            <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{movie.resolution}</h5>
            {movie.audio?
             <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase"><i className="fa fa-video-camera dark:text-white" aria-hidden="true"></i> {movie.codec}</h5>
             :<h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase"><FontAwesomeIcon icon={faVolumeXmark} /> {movie.codec}</h5>
            
            }
             <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{movie.size.toFixed(2)} MB</h5>
          </div>
          </a>
      </div>
      ))

}

</div>


    
    </main>
  )
}
