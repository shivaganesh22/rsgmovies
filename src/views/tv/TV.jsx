import React from 'react'
import { Link } from 'react-router-dom'

export default function TV() {
   
    return (
      <main>
       <div className="flex justify-center my-4">
          <Link onClick={()=>window.open("https://rsg-movies.vercel.app/tv")}>
          <button className="w-64 text-xl text-white bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-lg px-5 py-2.5 mr-2 mb-2 font-medium">Go to Sports Page</button>
          </Link>          
        </div>
    </main>
    )
}
