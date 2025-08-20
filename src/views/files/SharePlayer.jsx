import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate,useParams } from 'react-router-dom';
import fluidPlayer from 'fluid-player';
import { toastSuccess, toastWarning } from '../components/Notifications';

import MyPlyrVideo from './MyPlyrVideo';
export default function SharePlayer() {
    const params = useParams();
    const [data, setData] = useState(null)
    const [url, setUrl] = useState("")
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const videoRef1 = useRef(null);
    const [isShow, setShow] = useState(() => {
        const storedValue = localStorage.getItem("player");
        return storedValue !== null ? JSON.parse(storedValue) : true;
      });

    useEffect(() => {
        const fetchFile = async () => {
            try {
                const response = await fetch(`https://rsg-movies.vercel.app/react/jwt/fetch/share/${params.id}/${params.key}`, {
                    method: 'GET',
                });
                const result = await response.json();
                if (response.status == 200) {
                    setData(result);
                    setUrl(result.url);
                    // initPlayer();
                    initializeFluidPlayer();
                } else {
                    toastWarning(result["detail"])
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchFile();
        // if (videoRef.current && !videoRef.current.fluidPlayerInitialized) {
        //   initializeFluidPlayer();
        //   videoRef.current.fluidPlayerInitialized = true;
        // }
    }, []);
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

    const initializeFluidPlayer = () => {
        fluidPlayer(videoRef.current, {
            "layoutControls": {
                "controlBar": {
                    "autoHideTimeout": 3,
                    "animated": true,
                    "playbackRates": ['x2', 'x1.75', 'x1.5', 'x1.35', 'x1.25', 'x1', 'x0.5'],
                    "autoHide": true
                },
                controlForwardBackward: {
                    show: true, // Default: false,
                    doubleTapMobile: true // Default: true
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
    const initPlayer = async () => {
        const { VidstackPlayer, VidstackPlayerLayout } = await import('https://cdn.vidstack.io/player');

        await VidstackPlayer.create({
            target: videoRef1.current,
            src: url,
            layout: new VidstackPlayerLayout({
            }),
        });
    };



    return (
        <main>
            <center>
                
                <h1 className="lg:text-4xl md:text-3xl text-2xl  font-bold my-3 text-center   text-gray-700  dark:text-white">{data && data.name}</h1>
                <div className='flex justify-center items-center'>
                    <div className="grid grid-cols-2 p-4 gap-5 place-items-center ">
                        <div className={`mr-4 hover:bg-gray-100 dark:hover:bg-gray-600 ${isShow ? "bg-gray-200 dark:bg-gray-600" : "bg-white dark:bg-gray-800"} border border-gray-200 rounded-lg shadow  dark:border-gray-700 w-40 max-h-128  overflow-hidden`}>
                            <Link onClick={(e) => { e.preventDefault(); setShow(true); localStorage.setItem("player", JSON.stringify(true)); }} >

                                <div className="p-1 text-black dark:text-white ">
                                    Player 1
                                </div>
                            </Link>
                        </div>
                        <div className={`mr-4 hover:bg-gray-100 dark:hover:bg-gray-600 ${!isShow ? "bg-gray-200 dark:bg-gray-600" : "bg-white dark:bg-gray-800"}   border border-gray-200 rounded-lg shadow  dark:border-gray-700 w-40 max-h-128  overflow-hidden`}>
                            <Link onClick={(e) => { e.preventDefault(); setShow(false); localStorage.setItem("player", JSON.stringify(false));}}>

                                <div className="p-1 text-black dark:text-white">
                                    Player 2
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="video">
                    {/* <link rel="stylesheet" href="https://cdn.vidstack.io/player/theme.css" />
                    <link rel="stylesheet" href="https://cdn.vidstack.io/player/video.css" /> */}
                    <div className={isShow ? "block" : "hidden"}>

                        {/* <video ref={videoRef1} className="w-full" controls>
                            <source
                                src={data && data.url}
                                type="video/mp4"
                            />
                        </video> */}
                        <video ref={videoRef} className="w-full" controls>
                            <source
                                src={data && data.url}
                                type="video/mp4"
                            />
                        </video>
                    </div>
                    <div className={!isShow ? "block" : "hidden"}>
                        {
                                <MyPlyrVideo videoSrc={data&&data.url}/>
                        }
                        {/* <video ref={videoRef} className="w-full" controls>
                            <source
                                src={data && data.url}
                                type="video/mp4"
                            />
                        </video> */}
                    </div>

                </div>

                <div >


                </div>



                <textarea id="message" rows="4" onClick={() => { }} className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Download link" value={data ? data.url : ""} readOnly></textarea>
                <div className='flex justify-center items-center'>
                    <div className="grid grid-cols-3 p-4 gap-5 place-items-center ">
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
                        <div className="m-4  bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 w-40 max-h-128  overflow-hidden">
                            <Link onClick={()=>{shareFolder()}}>

                                <div className="p-1">
                                    <i className="fa fa-share text-black dark:text-white" aria-hidden="true"></i>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>

            </center>

        </main>
    )
}
