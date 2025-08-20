import React, { useEffect, useState } from 'react'
import { useNavigate, Link,useParams } from 'react-router-dom'
import folderimg from "./folder.png"
import torrentimg from "./torrent.png"
import { useAuth } from '../other/AuthContext';
import MyLoader from '../MyLoader';
import { toastSuccess, toastWarning } from '../components/Notifications';

export default function GetShare() {
  const navigate = useNavigate();
  const params = useParams();
  const [data, setData] = useState(null);
  const [files, setFiles] = useState([]);
  const { startLoad, stopLoad } = useAuth();
  const fetchData = async () => {
    startLoad();
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/jwt/get/share/${params.key}/`, {
        method: 'GET',
      });
      const result = await response.json();
      if (response.status == 200) {
        setData(result);
        setFiles(result.files)
      }
      else {
        toastWarning(result["detail"])
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    stopLoad();
  };
  useEffect(() => {
    fetchData();
  }, []);
  
  const copyFile = async (id) => {
    startLoad();
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/jwt/fetch/share/${id}/${data.key}`, {
        method: 'GET',
      });
      const result = await response.json();
      if(response.status==200){
      await navigator.clipboard.writeText(result.url);
      toastSuccess("Copied");
      }
      else{
        toastSuccess(result["detail"]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    }
    stopLoad();
  }
  const downloadFile = async (id) => {
    startLoad();
    try {
      const response = await fetch(`https://rsg-movies.vercel.app/react/jwt/fetch/share/${id}/${data.key}`, {
        method: 'GET',
      });
      const result = await response.json();
      if(response.status==200){
      window.open(result.url);
      }
      else{
        toastSuccess(result["detail"]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    stopLoad();
  }
const shareFolder = async () => {
  const shareText = `🎬 ${data.name}\n\n▶️ Stream or access instantly:\n${data.link}\n\n— Powered by RSG Movies`;
  if (navigator.share) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      // --- Mobile: only text (remove url to avoid duplication)
      await navigator.share({
        title: data.name,
        text: shareText,
      });
    } else {
      // --- Laptop/Desktop: include both text and url
      await navigator.share({
        title: data.name,
        text: shareText,
        url: data.link,
      });
    }
  } else {
    // --- No native share: fallback to copy
    await navigator.clipboard.writeText(shareText);
    toastSuccess("Copied to clipboard");
  }

};

  function formatTime(timeString) {
    const utcTime = new Date(timeString + ' UTC'); // Parse as UTC
    const now = new Date(); // Get current local time
    const timeDiff = now - utcTime; // Difference in milliseconds

    // Calculate time differences
    const seconds = Math.floor(timeDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    // Formatting options for "Today at HH:MM AM/PM"
    const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };

    if (days === 0) {
      return `Today at ${utcTime.toLocaleTimeString([], timeOptions)}`;
    } else if (days === 1) {
      return `Yesterday at ${utcTime.toLocaleTimeString([], timeOptions)}`;
    } else if (days < 30) {
      return `${days} days ago`;
    } else if (months === 1) {
      return "1 month ago";
    } else if (months < 12) {
      return `${months} months ago`;
    } else if (years === 1) {
      return "1 year ago";
    } else {
      return `${years} years ago`;
    }
  }

  return (
    <MyLoader>
      <main>
       
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
        <center>
          <ul className=" divide-y divide-gray-200 dark:divide-gray-700">
            {
              files.map((item, index) => (
                <li className="pb-3 sm:pb-4" key={item.folder_file_id}>
                  <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="flex-shrink-0">
                      <img className="w-8 h-8 rounded-full" src={item.thumb} alt="Neil image" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-md pt-3 font-medium text-gray-900 truncate dark:text-white">
                        {item.name}
                      </p>
                      <div className='flex  justify-center items-center '>
                        <div className="grid grid-cols-4 pt-3 pb-1 gap-5 place-items-center ">
                          <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700  max-h-128  overflow-hidden">
                            <Link to={`/player/share/${item.folder_file_id}/${data.key}`}>

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
                            <Link onClick={() => { copyFile(item.folder_file_id) }}>

                              <div className="p-1">
                                <i className="fa fa-copy text-black dark:text-white" aria-hidden="true"></i>

                              </div>
                            </Link>
                          </div>
                          <div className="w-12 bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700  max-h-128  overflow-hidden">
                        <Link onClick={()=>{shareFolder()}}>

                            <div className="p-1">
                              <i className={`fa fa-share text-black dark:text-white`} aria-hidden="true"></i>

                            </div>
                          </Link>
                        </div>
                        </div>
                      </div>
                      <p className="text-xs pt-1 font-medium text-gray-900 truncate dark:text-white">
                        {formatTime(item.last_update)}
                      </p>
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
