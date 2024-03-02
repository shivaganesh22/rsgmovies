import React,{useEffect,useState ,useRef} from 'react'
import { Link, useNavigate } from 'react-router-dom';
import fluidPlayer from 'fluid-player';


export default function Player() {
  const urlSearchString = window.location.search;
  const params = new URLSearchParams(urlSearchString);
  const [data,setData]=useState(null)
  const navigate=useNavigate();
  const videoRef = useRef(null);

  
  
 
  useEffect(() => {
    const fetchFolder = async () => {
        try {
            const response = await fetch(`https://rsg-movies.vercel.app/react/folder/file/${params.get("id")}`, {
              method: 'GET',
              headers: {
                'Authorization': `Token ${localStorage.getItem('token')}`
              },
            });
            const result = await response.json();
            setData(result);
            initializeFluidPlayer();
            
          } catch (error) {
            console.error('Error fetching data:', error);
          }
    };
    const fetchFile = async () => {
        try {
            const response = await fetch(`https://rsg-movies.vercel.app/react/file/${params.get("id")}`, {
              method: 'GET',
              headers: {
                'Authorization': `Token ${localStorage.getItem('token')}`
              },
            });
            const result = await response.json();
            setData(result);
            initializeFluidPlayer();
            
          } catch (error) {
            console.error('Error fetching data:', error);
          }
    };
    if (localStorage.getItem('token') == null) {
        navigate('/login');
      } else {
        if (params.get("mode")=="folder") fetchFolder();
        else fetchFile();
      }
    
    
  
    // if (videoRef.current && !videoRef.current.fluidPlayerInitialized) {
    //   initializeFluidPlayer();
    //   videoRef.current.fluidPlayerInitialized = true;
    // }
  },[] );


  const initializeFluidPlayer = () => {
    fluidPlayer(videoRef.current,	{
      "layoutControls": {
        "controlBar": {
          "autoHideTimeout": 3,
          "animated": true,
          "playbackRates": ['x2','x1.75','x1.5','x1.35','x1.25', 'x1','x0.5'],
          "autoHide": true
        },
        "htmlOnPauseBlock": {
          "html": null,
          "height": null,
          "width": null
        },
        "autoPlay": false,
        "mute": false,
        "allowTheatre": false,
        "playPauseAnimation": true,
        "playbackRateEnabled": true,
        "allowDownload": false,
        "playButtonShowing": true,
        "fillToContainer": false,
        "posterImage": "",
            "subtitlesEnabled": false,
            "primaryColor": "#28B8ED",
            
      },
      "vastOptions": {
        "adList": [],
        "adCTAText": false,
        "adCTATextPosition": ""
      }
     
    });
  };

  return (
    <main>
      <center>
      <h1 className="lg:text-4xl md:text-3xl text-2xl  font-bold my-3 text-center   text-gray-700  dark:text-white">{data&&data.name}</h1> <br/>
    
    <div className="video">
   <video ref={videoRef} className="w-11/12" controls>
     <source
       src={data && data.url}
       type="video/mp4"
     />
   </video>
 </div>
 

<textarea id="message" rows="4" onClick={()=>{}} className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Download link" value={data?data.url:""} readOnly></textarea>
<div className='flex justify-center items-center'>
<div className="grid grid-cols-2 p-4 gap-5 place-items-center ">
<div className="m-4  bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
    <Link  onClick={()=>{const ta=document.getElementById("message");ta.select();document.execCommand('copy');}}>
        
    <div className="p-1">
    <i className="fa fa-copy text-black dark:text-white" aria-hidden="true"></i>
    </div>
    </Link>
</div>
<div className="m-4  bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
    <Link  to={data&&data.url}>
        
    <div className="p-1">
    <i className="fa fa-download text-black dark:text-white" aria-hidden="true"></i>
    </div>
    </Link>
</div>
</div>
</div>
   
        </center>  
   
    </main>
  )
}
