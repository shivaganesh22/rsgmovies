import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import folderimg from "./folder.png"
import torrentimg from "./torrent.png"
import { useAuth } from '../other/AuthContext';
import MyLoader from '../MyLoader';
import { toastSuccess, toastWarning } from '../components/Notifications';

export default function Files() {
  const navigate = useNavigate();
  const [isFileEditing, setFileEditing] = useState([]);
  const [load, setLoad] = useState(true);
  const [isFolderEditing, setFolderEditing] = useState([])
  const { loading, setStorage ,startLoad,stopLoad} = useAuth();
  const [folders, setFolders] = useState([]);
  const [torrents, setTorrents] = useState([]);
  const [files, setFiles] = useState([]);
  const [shouldFetch, setFetch] = useState(true);
  const fetchData = async () => {
    if (shouldFetch) {
      if (load) startLoad();
      try {
        const response = await fetch("https://rsg-movies.vercel.app/react/files/", {
          method: 'GET',
          headers: {
            'Authorization': `Token ${localStorage.getItem('token')}`
          },
        });
        const result = await response.json();
        if(load) setLoad(false)
        setStorage(`${(result.space_used / (1024 * 1024 * 1024)).toFixed(1)} / ${(result.space_max / (1024 * 1024 * 1024)).toFixed(1)} GB`);
        setFolders(result.folders);
        setFiles(result.files);
        setTorrents(result.torrents);
        setFolderEditing(Array.from({ length: result.folders.length }, () => false))
        setFileEditing(Array.from({ length: result.files.length }, () => false))
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      stopLoad();
    }
  };
  useEffect(() => {
    if (localStorage.getItem('token') == null) {
      navigate('/login');
    } else {
      fetchData();
      const intervalId = setInterval(fetchData, 5000);
      return () => clearInterval(intervalId);
    }
  }, [navigate, shouldFetch,load]);
  const deleteTorrent = async (id) => {
    startLoad();
    setFetch(false);
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/deletetorrent/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
      });
      // window.location.reload()

    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setFetch(true);
  }

  const downloadFolder = async (id) => {
    startLoad();
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/folder/file/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
      });
      const result = await response.json();
      window.open(result.url)


    } catch (error) {
      console.error('Error fetching data:', error);
    }
    stopLoad();
  }
  const deleteFolder = async (id) => {
    startLoad();
    setFetch(false);
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/deletefolder/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
      });
      // window.location.reload()

    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setFetch(true);
  }
  const editFolder = async (e, id) => {
    e.preventDefault();
    startLoad();
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/rename/folder/${id}/?name=${e.target.msg.value}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
      });
      // window.location.reload()

    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setFetch(true);
  }
  const editFile = async (e, id) => {
    e.preventDefault();
    startLoad();
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/rename/file/${id}/?name=${e.target.msg.value}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
      });
      // window.location.reload()

    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setFetch(true);
  }
  const downloadFile = async (id) => {
    startLoad();
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/file/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
      });
      const result = await response.json();
      window.open(result.url)


    } catch (error) {
      console.error('Error fetching data:', error);
    }
    stopLoad();
  }
  const deleteFile = async (id) => {
    startLoad();
    setFetch(false);
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/deletefile/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
      });
      window.location.reload()

    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setFetch(true);
  }
  const addTorrent = async (e) => {
    e.preventDefault();
    startLoad();
    setFetch(false);
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/addtorrent/?link=${e.target.link.value}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${localStorage.getItem('token')}`
        },
      });
      const result = await response.json();
      if (result.result == true) {
        toastSuccess("Torrent Added");
      }
      else {
        toastWarning(result.result)
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setFetch(true);

  }

  return (
     
    <MyLoader>
      <main>
        
      <form className="max-w-md mx-auto" onSubmit={addTorrent}>    
    <label  className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
    <div className="relative">
        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
            </svg>
        </div>
        <input type="search" id="default-search" autoComplete="off" name='link'  className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Enter magnet url..." required />
        <button type="submit"   className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Add</button>
    </div>
</form>
<br/>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
      <center>
        <ul className=" divide-y divide-gray-200 dark:divide-gray-700">
          {
            torrents.map(item => (
              <li className="pb-3 sm:pb-4" key={item.id}>
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="flex-shrink-0">
                    <img className="w-8 h-8 rounded-full" src={torrentimg} alt="Neil image" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-md font-medium text-gray-900 truncate dark:text-white">
                      {item.name}
                    </p>


                    <div className='p-4'>
                      <div className=" w-full max-w-md bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: item.progress + "%", float: "left" }} ></div>
                      </div>

                    </div>
                    {item.warnings != null && item.warnings != "[]" ? <p className="text-sm pb-4 text-gray-500 truncate dark:text-gray-400">
                      {item.warnings}
                    </p> : ""}

                    <div className=" w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700  max-h-128  overflow-hidden">
                      <Link onClick={() => { deleteTorrent(item.id) }}>

                        <div className="p-1">
                          <i className="fa fa-trash text-black dark:text-white" aria-hidden="true"></i>

                        </div>
                      </Link>
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
            folders.map((item, index) => (

              <li className="pb-3 sm:pb-4" key={item.id}>
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="flex-shrink-0">
                    <img className="w-8 h-8 rounded-full" src={folderimg} alt="Neil image" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-md pt-3 font-medium text-gray-900 truncate dark:text-white">
                      {item.name}
                    </p>

                    <div className='flex justify-center items-center'>
                      <div className="grid grid-cols-5 pt-3 pb-1 gap-5 place-items-center ">
                        <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700  max-h-128  overflow-hidden">
                          <Link to={`/player/?mode=folder&id=${item.id}`}>

                            <div className="p-1">
                              <i className="fa fa-play text-black dark:text-white" aria-hidden="true"></i>

                            </div>
                          </Link>
                        </div>
                        <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700  max-h-128  overflow-hidden">
                          <Link onClick={() => { downloadFolder(item.id) }}>

                            <div className="p-1">
                              <i className="fa fa-download text-black dark:text-white" aria-hidden="true"></i>

                            </div>
                          </Link>
                        </div>
                        <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700  max-h-128  overflow-hidden">
                          <Link to={`/files/open/${item.id}`}>

                            <div className="p-1">
                              <i className="fa fa-folder-open text-black dark:text-white" aria-hidden="true"></i>

                            </div>
                          </Link>
                        </div>
                        <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700  max-h-128  overflow-hidden">
                          <Link onClick={() => { setFetch(false); const newA = isFolderEditing; newA[index] = !newA[index]; setFolderEditing(newA) }}>

                            <div className="p-1">
                              <i className={`fa fa-${isFolderEditing[index] ? "times" : "edit"} text-black dark:text-white`} aria-hidden="true"></i>

                            </div>
                          </Link>
                        </div>
                        <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700  max-h-128  overflow-hidden">
                          <Link onClick={() => { deleteFolder(item.id) }}>

                            <div className="p-1">
                              <i className="fa fa-trash text-black dark:text-white" aria-hidden="true"></i>

                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>



                    {
                      isFolderEditing[index] ?

                        <form onSubmit={(e) => { editFolder(e, item.id) }} >
                          <div className="flex items-center px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                            <textarea id="chat" rows="1" name='msg' className="block mx-4 p-2.5 w-full text-sm text-gray-900 bg-white rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" defaultValue={item.name} placeholder="Change name..."  ></textarea>
                            <button type="submit" className="inline-flex justify-center p-2 text-blue-600 rounded-full cursor-pointer hover:bg-blue-100 dark:text-blue-500 dark:hover:bg-gray-600">
                              <svg className="w-5 h-5 rotate-90 rtl:-rotate-90" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 20">
                                <path d="m17.914 18.594-8-18a1 1 0 0 0-1.828 0l-8 18a1 1 0 0 0 1.157 1.376L8 18.281V9a1 1 0 0 1 2 0v9.281l6.758 1.689a1 1 0 0 0 1.156-1.376Z" />
                              </svg>
                              <span className="sr-only">Send message</span>
                            </button>
                          </div>
                        </form> : ""
                    }



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
            files.map((item, index) => (
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
                      <div className="grid grid-cols-4 p-4 gap-5 place-items-center ">
                        <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700  max-h-128  overflow-hidden">
                          <Link to={`/player/?mode=file&id=${item.folder_file_id}`}>

                            <div className="p-1">
                              <i className="fa fa-play text-black dark:text-white" aria-hidden="true"></i>

                            </div>
                          </Link>
                        </div>
                        <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700  max-h-128  overflow-hidden">
                          <Link onClick={() => { downloadFile(item.folder_file_id) }}>

                            <div className="p-1">
                              <i className="fa fa-download text-black dark:text-white" aria-hidden="true"></i>

                            </div>
                          </Link>
                        </div>

                        <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700  max-h-128  overflow-hidden">
                          <Link onClick={() => { setFetch(false); const newA = isFileEditing; newA[index] = !newA[index]; setFileEditing(newA) }}>

                            <div className="p-1">
                              <i className={`fa fa-${isFileEditing[index] ? "times" : "edit"} text-black dark:text-white`} aria-hidden="true"></i>

                            </div>
                          </Link>
                        </div>
                        <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700  max-h-128  overflow-hidden">
                          <Link onClick={() => { deleteFile(item.folder_file_id) }}>

                            <div className="p-1">
                              <i className="fa fa-trash text-black dark:text-white" aria-hidden="true"></i>

                            </div>
                          </Link>
                        </div>
                      </div>
                    </div>
                    {
                      isFileEditing[index] ?

                        <form onSubmit={(e) => { editFile(e, item.folder_file_id) }} >
                          <div className="flex items-center px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                            <textarea id="chat" rows="1" name='msg' className="block mx-4 p-2.5 w-full text-sm text-gray-900 bg-white rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" defaultValue={item.name} placeholder="Change name..."  ></textarea>
                            <button type="submit" className="inline-flex justify-center p-2 text-blue-600 rounded-full cursor-pointer hover:bg-blue-100 dark:text-blue-500 dark:hover:bg-gray-600">
                              <svg className="w-5 h-5 rotate-90 rtl:-rotate-90" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 18 20">
                                <path d="m17.914 18.594-8-18a1 1 0 0 0-1.828 0l-8 18a1 1 0 0 0 1.157 1.376L8 18.281V9a1 1 0 0 1 2 0v9.281l6.758 1.689a1 1 0 0 0 1.156-1.376Z" />
                              </svg>
                              <span className="sr-only">Send message</span>
                            </button>
                          </div>
                        </form> : ""
                    }
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
      </MyLoader>

    
  )
}
