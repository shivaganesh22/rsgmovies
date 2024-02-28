import React from 'react'

export default function Doodplay() {
    const urlSearchString = window.location.search;
    const params = new URLSearchParams(urlSearchString);
    return (
        <main>
            <center>
        <div className=" bg-white border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 lg:h-screen   w-full md:h-96 h-72 ">
            <a href={params.get("link")}>
                <button className="w-64 text-xl text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-lg px-5 py-2.5 mr-2 mb-2 font-medium">Doodplay</button>
            </a>
            <iframe className='w-full h-full' src={params.get("link")} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>


        </div>
        </center>
        </main>
    )
}
