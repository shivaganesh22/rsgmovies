import React,{useEffect} from 'react'
import {useNavigate} from 'react-router-dom'

export default function Files() {
  const navigate=useNavigate();
  useEffect(()=>{
    if(localStorage.getItem('token')==null) navigate('/login');
  },)
  return (
    <div>Files</div>
  )
}
