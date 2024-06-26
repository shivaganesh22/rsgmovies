import React ,{useState,useEffect} from 'react'
import { useAuth } from '../other/AuthContext';
import MyLoader from '../MyLoader';
import { toastWarning } from '../components/Notifications';
export default function Tamilmv() {
    const {startLoad,stopLoad}=useAuth();
    const [movies,setMovies] = useState(JSON.parse(localStorage.getItem("tamilmv")) || "");;
    useEffect(() => {
      const fetchData = async () => {
        startLoad();
        try {
          if(movies) stopLoad();
          const response = await fetch(`https://rsg-movies.vercel.app/react/tamilmv/`);
          const result = await response.json();
          if(response.status==200){

            setMovies(result.items);
            localStorage.setItem("tamilmv", JSON.stringify(result.items));
          }else{
            toastWarning("Failed to get results")
          }
         
        } catch (error) {
          console.error('Error fetching data:', error);
        }
        stopLoad();
      };
  
      fetchData();
    }, );
    return (
      <MyLoader>
        <main>
        <center>
         <div className='my-4' dangerouslySetInnerHTML={{ __html: movies }} />
        </center>
      </main>
        </MyLoader>
    )
}
