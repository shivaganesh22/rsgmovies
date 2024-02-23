import React, { useEffect, useState } from 'react'
export default function IBommaMovie() {
    const urlSearchString = window.location.search;
    const params = new URLSearchParams(urlSearchString);
    const [data, setData] = useState("");
    


    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`https://rsg-movies.vercel.app/api/ibomma/movie/?link=${params.get("link")}`);
                const result = await response.json();
                setData(result);


            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);
    const getVideo = (url) => {
        url = String(url)
        console.log(url.split("v=")[1]);
        return url.split("v=")[1]

    }
    return (
        <main>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
            <section className="flex justify-around flex-wrap py-5">
                <div className="max-w-sm">
                    <img className="rounded lg:w-72 lg:mt-5 md:mt-14 md:w-56" src={data.image} alt={data.name} />
                </div>
                <div className="max-w-2xl text-gray-700 text-lg dark:text-white">
                    <h1 className="lg:text-4xl md:text-3xl text-2xl md:text-left font-bold my-3 text-center lg:text-left">{data.name}</h1>
                    <p className="text-left my-4">{data.director}</p>
                    <p className="text-left my-4">{data.cast}</p>
                    <p className="text-left my-4">Genre:{data.genre}</p>
                    <p className="text-left my-4">{data.desc}</p>
                </div>

            </section>
            <div className="grid grid-cols-1 p-4  lg:grid-cols-2 md:grid-cols-1 gap-5  md:gap-4 md:p-0 lg:p-0 lg:gap-4 items-center">
            <div className="w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:w-128 lg:max-w-128  overflow-hidden md:justify-self-center ">
                    <a href={data.dlink}>
                        <button className="w-64 text-xl text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-lg px-5 py-2.5 mr-2 mb-2 font-medium">Download</button>
                    </a>
                    <iframe className='w-full'  height="315" src={data.link} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
                    

                </div>

                <div className="w-sm bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:w-128 lg:w-128  overflow-hidden md:justify-self-center">
                    <a href={data.trailer}>
                        <button className="w-64 text-xl text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-lg px-5 py-2.5 mr-2 mb-2 font-medium">Trailer</button>
                    </a>
                    <iframe className='w-full' height="315" src={`https://www.youtube.com/embed/${getVideo(data.trailer)}`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
                    

                </div>
                
                
                
            </div>

        </main>
    )
}
