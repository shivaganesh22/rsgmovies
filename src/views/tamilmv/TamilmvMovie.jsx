import React, { useEffect, useState } from 'react'
import { Link ,useNavigate} from 'react-router-dom'
import { useAuth } from '../other/AuthContext';
import MyLoader from '../MyLoader';
import { toastSuccess, toastWarning } from '../components/Notifications';


export default function TamilmvMovie() {
    const {startLoad,stopLoad}=useAuth();
    const urlSearchString = window.location.search;
    const params = new URLSearchParams(urlSearchString);
    const navigate=useNavigate();
    const [images, setImages] = useState([]);
    const [links, setLinks] = useState([]);


    useEffect(() => {
        const fetchData = async () => {
          startLoad();
            try {
                const response = await fetch(`https://rsg-movies.vercel.app/api/tamilmv/movie/?link=${params.get("link")}`);
                const result = await response.json();
                if(response.status==200){
                  setImages(result.images);
                  setLinks(result.links);
                }else{
                  toastWarning("Failed to get results")
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }
            stopLoad();
        };

        fetchData();
    }, []);
    const addTorrent= async(link)=>{
      if (localStorage.getItem('session') == null) {
        window.location.href="/login";
        toastWarning("Login First");
      }
      else{
        startLoad();
        try {
          const response = await fetch(`https://rsg-movies.vercel.app/react/jwt/addtorrent/?link=${link}`, {
            method: 'GET',
            headers: {
              'Authorization': `Token ${localStorage.getItem('session')}`
            },
          });
          const result = await response.json();
          if(response.status==200){
            if(result.result==true){
              toastSuccess("Torrent Added");
              navigate('/files');
            }
            else{
              toastWarning(result.result)
            }
          }
          else{
            toastWarning(result["detail"])
          }
          
        } catch (error) {
          console.error('Error fetching data:', error);
        }
        stopLoad();
      }
        
      }
    return (
        <MyLoader>
          <main>
            <center>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
            <section className="">
                
                { images.length>0?
                <img className="h-auto w-64 lg:w-80 rounded p-4 mx-auto" src={images[0].link} alt="image"/>:""}


            </section>
            {/* <div className="grid grid-cols-1 p-4 lg:grid-cols-2 md:grid-cols-2 gap-5  md:gap-4 md:p-0 lg:p-0 lg:gap-4 ">
                {links.map((movie, index) => (
                    <div key={index} className="w-full w-sm  border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center">
                        <Link onClick={()=>addTorrent(movie.link)}>
                            <div className="p-1">
                                <i className="fa fa-upload text-black dark:text-white" aria-hidden="true"></i>
                                <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{movie.name}</h5>
                            </div>
                        </Link>
                    </div>
                ))}
            </div> */}
            <ul className="grid grid-cols-1 p-4 lg:grid-cols-2 md:grid-cols-2 gap-5  md:gap-4 md:p-0 lg:p-0 lg:gap-4">

            {links.map((genre, index) => (
              
                <li className="p-2 bg-white  hover:bg-gray-100 dark:hover:bg-gray-600 w-full w-sm  border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center">
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="flex-1 min-w-0">
                    <Link onClick={() => { addTorrent(genre.link) }}>
                      <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
                        <i className="fa fa-upload text-black dark:text-white" aria-hidden="true"></i>
                      </p>
                      <p className="text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">
                        {genre.name}
                      </p>
                    </Link>
                    </div>
                    <div className="border border-gray-200 dark:border-gray-700  h-16"></div>
                    <div className="flex-shrink-0" >
                    <a href={`https://webtor.io/${genre.link}`} target='_blank'>
                    <svg width="64px" className='stroke-gray-700 dark:stroke-gray-400 pr-3' height="64px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g clip-path="url(#clip0_429_11238)"> <path d="M19 10.2679C20.3333 11.0377 20.3333 12.9623 19 13.7321L10 18.9282C8.66667 19.698 7 18.7358 7 17.1962L7 6.80385C7 5.26425 8.66667 4.302 10 5.0718L19 10.2679Z" stroke="" stroke-width="2.5" stroke-linejoin="round"></path> </g> <defs> <clipPath id="clip0_429_11238"> <rect width="24" height="24" fill="white"></rect> </clipPath> </defs> </g></svg>
                    </a>
                    </div>
                  </div>
                </li>
            ))}

          </ul>
            </center>
        </main>
          </MyLoader>
    )
}
