import React,{useEffect,useState} from 'react'
import { useNavigate } from 'react-router-dom';
export default function Player() {
  const urlSearchString = window.location.search;
  const params = new URLSearchParams(urlSearchString);
  const [data,setData]=useState(null)
  const navigate=useNavigate();
  useEffect(() => {
    const fetchFolder = async () => {
        try {
            const response = await fetch(`https://rsg-movies.vercel.app/react/folder/file/${params.get("id")}`, {
              method: 'GET',
              headers: {
                'Authorization': `Token ${localStorage.getItem('token')}`
              },
            });
            const result = await response.json();
            setData(result);
            console.log(result);
            
          } catch (error) {
            console.error('Error fetching data:', error);
          }
    };
    const fetchFile = async () => {
        try {
            const response = await fetch(`https://rsg-movies.vercel.app/react/file/${params.get("id")}`, {
              method: 'GET',
              headers: {
                'Authorization': `Token ${localStorage.getItem('token')}`
              },
            });
            const result = await response.json();
            
            
          } catch (error) {
            console.error('Error fetching data:', error);
          }
    };
    if (localStorage.getItem('token') == null) {
        navigate('/login');
      } else {
        if (params.get("mode")=="folder") fetchFolder();
        else fetchFile();
      }
    
  },[] );
  return (
    <main>
        
        <h5>{data&&data.name}</h5> <br/>
    <div className="video">
        
      <video id="video-id" style={{width:"95%"}} src={data&&data.url}> </video>
   </div>
   <script src="https://cdn.fluidplayer.com/v3/current/fluidplayer.min.js"></script>
   
    </main>
  )
}
