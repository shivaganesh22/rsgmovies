import React ,{useState,useEffect} from 'react'

export default function Tamilmv() {
    const [movies,setMovies] = useState(JSON.parse(localStorage.getItem("tamilmv")) || "");;
    useEffect(() => {
      const fetchData = async () => {
        try {
          const response = await fetch(`https://rsg-movies.vercel.app/api/tamilmv/`);
          const result = await response.json();
          setMovies(result.items);
          localStorage.setItem("tamilmv", JSON.stringify(result.items));
         
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      };
  
      fetchData();
    }, );
    return (
      <main>
        <center>

         <div className='my-4' dangerouslySetInnerHTML={{ __html: movies }} />
        </center>
      </main>
    )
}
