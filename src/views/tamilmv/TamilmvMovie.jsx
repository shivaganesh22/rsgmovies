import React, { useEffect, useState } from 'react'
import { Link ,useNavigate} from 'react-router-dom'

import { toastSuccess, toastWarning } from '../components/Notifications';


export default function TamilmvMovie() {
    const urlSearchString = window.location.search;
    const params = new URLSearchParams(urlSearchString);
    const navigate=useNavigate();
    const [images, setImages] = useState([]);
    const [links, setLinks] = useState([]);


    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`https://rsg-movies.vercel.app/api/tamilmv/movie/?link=${params.get("link")}`);
                const result = await response.json();
                setImages(result.images);
                setLinks(result.links);

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, );
    const addTorrent= async(link)=>{
        
        try {
          const response = await fetch(`https://rsg-movies.vercel.app/react/addtorrent/?link=${link}`, {
            method: 'GET',
            headers: {
              'Authorization': `Token ${localStorage.getItem('token')}`
            },
          });
          const result = await response.json();
          if(result.result==true){
            toastSuccess("Torrent Added");
            navigate('/files');
          }
          else{
            toastWarning(result.result)
          }
          
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      }
    return (
        <main>
            <center>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
            <section className="">
                
                { images.length>0?
                <img className="h-auto w-64 lg:w-80 rounded p-4 mx-auto" src={images[0].link} alt="image"/>:""}


            </section>
            <div className="grid grid-cols-1 p-4 lg:grid-cols-2 md:grid-cols-2 gap-5  md:gap-4 md:p-0 lg:p-0 lg:gap-4 ">
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
            </div>
            </center>
        </main>
    )
}
