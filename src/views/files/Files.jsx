import React, { useEffect, useState } from 'react'
import { useNavigate ,Link} from 'react-router-dom'
import folderimg from "./folder.png"
import { useAuth } from '../other/AuthContext';

export default function Files() {
  const navigate = useNavigate();
  const { storage, setStorage } = useAuth();
  const [folders, setFolders] = useState([]);
  const [torrents, setTorrents] = useState([]);
  const [files, setFiles] = useState([]);
  useEffect(() => {

    const fetchData = async () => {
      try {
        const response = await fetch("https://rsg-movies.vercel.app/react/files/", {
          method: 'GET',
          headers: {
            'Authorization': `Token ${localStorage.getItem('token')}`
          },

        });
        const result = await response.json()

        setStorage(`${(result.space_used / (1024 * 1024 * 1024)).toFixed(1)} / ${(result.space_max / (1024 * 1024 * 1024)).toFixed(1)} GB`)
        setFolders(result.folders)
        setFiles(result.files)
        setTorrents(result.torrents)
        console.log(result);


      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    if (localStorage.getItem('token') == null) navigate('/login');
    else fetchData();
  }, [navigate])


  return (
    <main>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css"/>
      <center>




        <ul className=" divide-y divide-gray-200 dark:divide-gray-700">
          {
            torrents.map(item => (
              <li className="pb-3 sm:pb-4" key={item.id}>
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="flex-shrink-0">
                    <img className="w-8 h-8 rounded-full" src={folderimg} alt="Neil image" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-md font-medium text-gray-900 truncate dark:text-white">
                      {item.name}
                    </p>
                    <p className="text-sm  text-gray-500 truncate dark:text-gray-400">
                      email@flowbite.com
                    </p>
                    <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: "80%", float: "left" }} ></div>
                    </div>
                  </div>
                  <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                    {(item.size / (1024 * 1024 * 1024)).toFixed(1)} GB
                  </div>
                </div>
              </li>
            ))
          }

        </ul>
        <ul className=" divide-y divide-gray-200 dark:divide-gray-700">
          {
            folders.map(item => (
              <li className="pb-3 sm:pb-4" key={item.id}>
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="flex-shrink-0">
                    <img className="w-8 h-8 rounded-full" src={folderimg} alt="Neil image" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-md font-medium text-gray-900 truncate dark:text-white">
                      {item.name}
                    </p>
                 
                    <div className='flex justify-center items-center'>
                    <div className="grid grid-cols-5 p-4 gap-5 place-items-center ">
                      <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                        <Link href={`/movierulz/movie?link=`}>

                          <div className="p-1">
                            <i className="fa fa-play text-black dark:text-white" aria-hidden="true"></i>

                          </div>
                        </Link>
                      </div>
                      <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                        <Link href={`/movierulz/movie?link=`}>

                          <div className="p-1">
                            <i className="fa fa-download text-black dark:text-white" aria-hidden="true"></i>

                          </div>
                        </Link>
                      </div>
                      <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                        <Link href={`/movierulz/movie?link=`}>

                          <div className="p-1">
                            <i className="fa fa-folder-open text-black dark:text-white" aria-hidden="true"></i>

                          </div>
                        </Link>
                      </div>
                      <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                        <Link href={`/movierulz/movie?link=`}>

                          <div className="p-1">
                            <i className="fa fa-edit text-black dark:text-white" aria-hidden="true"></i>

                          </div>
                        </Link>
                      </div>
                      <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                        <Link href={`/movierulz/movie?link=`}>

                          <div className="p-1">
                            <i className="fa fa-trash text-black dark:text-white" aria-hidden="true"></i>

                          </div>
                        </Link>
                      </div>
                    </div>
                    </div>
                
                  </div>
                  <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                    {(item.size / (1024 * 1024 * 1024)).toFixed(1)} GB
                  </div>
                </div>
              </li>
            ))
          }

        </ul>
        <ul className=" divide-y divide-gray-200 dark:divide-gray-700">
          {
            files.map(item => (
              <li className="pb-3 sm:pb-4" key={item.folder_file_id}>
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="flex-shrink-0">
                    <img className="w-8 h-8 rounded-full" src={item.thumb} alt="Neil image" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-md font-medium text-gray-900 truncate dark:text-white">
                      {item.name}
                    </p>
                    <div className='flex justify-center items-center '>
                    <div className="grid grid-cols-5 p-4 gap-5 place-items-center ">
                      <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                        <Link href={`/movierulz/movie?link=`}>

                          <div className="p-1">
                            <i className="fa fa-play text-black dark:text-white" aria-hidden="true"></i>

                          </div>
                        </Link>
                      </div>
                      <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                        <Link href={`/movierulz/movie?link=`}>

                          <div className="p-1">
                            <i className="fa fa-download text-black dark:text-white" aria-hidden="true"></i>

                          </div>
                        </Link>
                      </div>
                     
                      <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                        <Link href={`/movierulz/movie?link=`}>

                          <div className="p-1">
                            <i className="fa fa-edit text-black dark:text-white" aria-hidden="true"></i>

                          </div>
                        </Link>
                      </div>
                      <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                        <Link href={`/movierulz/movie?link=`}>

                          <div className="p-1">
                            <i className="fa fa-trash text-black dark:text-white" aria-hidden="true"></i>

                          </div>
                        </Link>
                      </div>
                    </div>
                    </div>
                  </div>
                  <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                    {(item.size / (1024 * 1024 * 1024)).toFixed(1)} GB
                  </div>
                </div>
              </li>
            ))
          }

        </ul>
      </center>
    </main>
  )
}
