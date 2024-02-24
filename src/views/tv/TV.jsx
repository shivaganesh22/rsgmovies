import React ,{useState,useEffect} from 'react'
import ReactDOM from 'react-dom';


export default function TV() {
    const [movies,setMovies] = useState("");
   
    useEffect(() => {
      const fetchData = async () => {
        try {
          const response = await fetch(`https://rsg-movies.vercel.app/api/sports/`);
          const result = await response.text();
          setMovies(result);
          
        //  console.log(result);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
  
      fetchData();
    }, []);
    return (
      <main >
        <div className='my-4 text-left' dangerouslySetInnerHTML={{ __html: movies }} />
      </main>
    )
}
