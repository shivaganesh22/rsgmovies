import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toastSuccess, toastWarning } from './components/Notifications';
import {useAuth} from './other/AuthContext'
import MyLoader from './MyLoader'
export default function Search() {
    const query = useRef("");
    const navigate = useNavigate();
    const [queryData, setQuery] = useState(JSON.parse(localStorage.getItem("globalquery")) ||"");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(JSON.parse(localStorage.getItem("torrentpages")) ||null);
    const {startLoad,stopLoad}=useAuth();
    const [data, setData] = useState(JSON.parse(localStorage.getItem("torrent")) ||"");
    const [links, setLinks] = useState(JSON.parse(localStorage.getItem("torrentlinks")) ||[]);
    const [spinner,setSpinner]=useState(false);
    const handleSubmit = (event) => {
        event.preventDefault();
        setQuery(query.current.value);
        setSpinner(true);
    }
   
    const fetchData = async () => {
        try {
            const response = await fetch(`https://rsg-movies.vercel.app/api/search/?q=${queryData}&page=${page}`);
            const result = await response.json();
            if(response.status==200){

                setData(result.name);
                setLinks(result.links);
                setPages(result.pages);
                localStorage.setItem("torrent", JSON.stringify(result.name));
                localStorage.setItem("torrentlinks", JSON.stringify(result.links));
                localStorage.setItem("torrentpages", JSON.stringify(result.pages));
                window.scrollTo(0, 0);
            }
            else{
                toastWarning("Failed to get results")
              }

        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setSpinner(false);
    };

    useEffect(() => {
       
        localStorage.setItem("globalquery", JSON.stringify(queryData));
        if (queryData) {
            fetchData();
        }
        else {
            setSpinner(false)
            setData("");
            setLinks([]);
            setPages(null);
            localStorage.removeItem("torrent");
            localStorage.removeItem("torrentlinks");
            localStorage.removeItem("torrentpages");
        }
    }, [queryData, page]);
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
            }else{
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
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" />
                <form className="max-w-md mx-auto">
                    <label className="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                            </svg>
                        </div>
                        <input type="search" id="default-search" value={queryData} ref={query} autoComplete="off" onChange={handleSubmit} className="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Search Anything here..." required />
                        <button type="submit" onClick={handleSubmit} className="text-white absolute end-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">Search</button>
                    </div>
                </form>
                <br />
                {spinner?
<div role="status">
    <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
    </svg>
    <span className="sr-only">Loading...</span>
    <br />
</div>:""
}
                <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{data ? data : ""}</h5>
                <div className="grid grid-cols-1 p-4 lg:grid-cols-2 md:grid-cols-2 gap-5  md:gap-4 md:p-0 lg:p-0 lg:gap-4 ">
                    {links.map((movie, index) => (
                        <div key={index} className="w-full w-sm  border border-gray-200 rounded-lg shadow dark:bg-gray-800 dark:border-gray-700 md:max-w-128 lg:max:w-128  overflow-hidden md:justify-self-center">
                            <Link onClick={() => { addTorrent(movie.link) }}>
                                <div className="p-0">
                                    <i className="fa fa-upload text-black dark:text-white" aria-hidden="true"></i>
                                    <h5 className="mb-2 text-1xl text-black font-bold tracking-tight text-gray-900 dark:text-white uppercase">{movie.name}</h5>
                                    <h5 className="mb-2 text-1xl text-black  tracking-tight text-gray-900 dark:text-white uppercase">{movie.date}  {movie.size}</h5>
                                </div>
                            </Link>
                            <Link onClick={() => { const tp = document.createElement('input'); tp.value = movie.link; document.body.appendChild(tp); tp.select(); document.execCommand('copy'); document.body.removeChild(tp); toastSuccess("Copied"); }} >

                                <div className="pb-3">
                                    <i className="fa fa-copy text-black dark:text-white" aria-hidden="true"></i>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>

                {
                    pages ?
                        <nav aria-label="Page navigation example">
                            <ul className="flex items-center justify-center -space-x-px h-10 text-base">
                                <li>
                                    <Link onClick={() => { setPage(page - 1) }} className="flex items-center justify-center px-4 h-10 ms-0 leading-tight text-gray-500 bg-white border border-e-0 border-gray-300 rounded-s-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                                        <span className="sr-only">Previous</span>
                                        <svg className="w-3 h-3 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 1 1 5l4 4" />
                                        </svg>
                                    </Link>
                                </li>
                                {pages.map((item, index) => (
                                    <li key={index}>
                                        <Link onClick={() => setPage(item.name)} className="flex items-center justify-center px-4 h-10 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">{item.name}</Link>
                                    </li>
                                ))}


                                <li>
                                    <Link onClick={() => setPage(page + 1)} className="flex items-center justify-center px-4 h-10 leading-tight text-gray-500 bg-white border border-gray-300 rounded-e-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                                        <span className="sr-only">Next</span>
                                        <svg className="w-3 h-3 rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4" />
                                        </svg>
                                    </Link>
                                </li>
                            </ul>
                        </nav> : ""

                }
            </center>
        </main>
        </MyLoader>
    )
}
