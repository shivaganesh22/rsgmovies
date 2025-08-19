import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { toastSuccess, toastWarning } from '../components/Notifications';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';

export default function Player1() {
    const urlSearchString = window.location.search;
    const params = new URLSearchParams(urlSearchString);
    const [data, setData] = useState(null)
    const navigate = useNavigate();
    const [spinner, setSpinner] = useState(true);
    useEffect(() => {
        const fetchFolder = async () => {
            setSpinner(true);
            try {
                const response = await fetch(`https://rsg-movies.vercel.app/react/jwt/folder/file/player/${params.get("id")}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${localStorage.getItem('session')}`
                    },
                });
                const result = await response.json();
                if (response.status == 200) {

                    setData(result);
                    
                }
                else {
                    toastWarning(result["detail"])
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }
            setSpinner(false);
        };
        const fetchFile = async () => {
            setSpinner(true);
            try {
                const response = await fetch(`https://rsg-movies.vercel.app/react/jwt/file/player/${params.get("id")}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Token ${localStorage.getItem('session')}`
                    },
                });
                const result = await response.json();
                if (response.status == 200) {

                    setData(result);
                   
                } else {
                    toastWarning(result["detail"])
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }
            setSpinner(false);
        };
        if (localStorage.getItem('session') == null) {
            navigate('/login');
        } else {
            if (params.get("mode") == "folder") fetchFolder();
            else fetchFile();
        }

    }, []);
    return (
        <main>
            <center>

                <h1 className="lg:text-4xl md:text-3xl text-2xl  font-bold my-3 text-center   text-gray-700  dark:text-white">{data && data.name}</h1>
                
                <center>
                    <div className="mb-4  bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                        <Link to={`/player/?mode=${params.get("mode")}&id=${params.get("id")}`}>

                            <div className="p-1">
                                <p className=" text-black dark:text-white" aria-hidden="true">Old Streams</p>
                            </div>
                        </Link>
                    </div>
                </center>
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
                <div className="video">
                    <div >

                        {data &&
                            <MediaPlayer title={data.name} src={data.m3u8}>
                                <MediaProvider />
                                <DefaultVideoLayout icons={defaultLayoutIcons} />
                            </MediaPlayer>}


                    </div>
                   

                </div>

                <div >


                </div>



                <textarea id="message" rows="4" onClick={() => { }} className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Stream link" value={data ? data.m3u8 : ""} readOnly></textarea>
                <div className='flex justify-center items-center'>
                    <div className="grid grid-cols-2 p-4 gap-5 place-items-center ">
                        <div className="m-4  bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                            <Link onClick={() => { const ta = document.getElementById("message"); ta.select(); document.execCommand('copy'); toastSuccess("Copied") }}>

                                <div className="p-1">
                                    <i className="fa fa-copy text-black dark:text-white" aria-hidden="true"></i>
                                </div>
                            </Link>
                        </div>
                        <div className="m-4  bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                            <Link to={data && data.url}>

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
