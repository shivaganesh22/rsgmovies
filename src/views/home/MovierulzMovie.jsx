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
  const { startLoad, stopLoad } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    const fetchData = async () => {
      startLoad();
      try {
        const response = await fetch(`https://rsg-movies.vercel.app/react/movierulz/movie/${params.id}/`);
        const result = await response.json();
        if(response.status==200){

          setData(result.details);
          setLinks(result.links);
        }
        else{
          toastWarning("Failed to get results")
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      stopLoad();
    };
    
    fetchData();
  },[params.id]);
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
      if(response.status==200){
        if (result.result == true) {
          toastSuccess("Torrent Added");
          navigate('/files');
        }
        else {
          toastWarning(result.result)
        }
      }
      else{
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
        
        <section className="flex justify-around flex-wrap py-5">
          <div className="max-w-sm">
            <img className="rounded lg:w-72 lg:mt-5 md:mt-14 md:w-56" src={data.image} alt={data.name} />
          </div>
          <div className="max-w-2xl text-gray-700 text-lg dark:text-white">
            <h1 className="lg:text-4xl md:text-3xl text-2xl md:text-left font-bold my-3 text-center lg:text-left">{data.name}</h1>
            <div className='my-4 text-left' dangerouslySetInnerHTML={{ __html: data.inf }} />
            <div className='my-4 text-left' dangerouslySetInnerHTML={{ __html: data.desc }} />
          </div>

        </section>
        <div className="grid grid-cols-2 p-4 lg:grid-cols-5 md:grid-cols-4 gap-5  md:gap-4 md:p-0 lg:p-0 lg:gap-4 ">
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
