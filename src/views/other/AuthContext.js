import React, { createContext, useContext, useState } from 'react';
import { json } from 'react-router-dom';


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setLoggedIn] = useState(localStorage.getItem('token')||false);
  const [storage, updateStorage] = useState(null);
  const [loading, updateLoading] = useState(false);
  const [navbar,updateNav] = useState(JSON.parse(localStorage.getItem("navbar")) || []);
  const [years,updateYears] = useState(JSON.parse(localStorage.getItem("years")) || []);
  const [genres,updateGenres] = useState(JSON.parse(localStorage.getItem("genres")) || []);
  const [topmovies,updateTopMovies] = useState(JSON.parse(localStorage.getItem("topmovies")) || []);

  const login = () => {
    // Perform login logic
    setLoggedIn(true);
  };

  const logout = () => {
    // Perform logout logic
    setLoggedIn(false);
  };
  const setStorage = (size) => {
    // localStorage.setItem('storage',JSON.stringify(size))
    updateStorage(size);
  };
  const startLoad = () => {
    updateLoading(true);
  };
  const stopLoad = () => {
    updateLoading(false);
  };
  const setNavbar=(data)=>{
    localStorage.setItem('navbar',JSON.stringify(data))
    updateNav(data)
  }
  const setGenres=(data)=>{
    localStorage.setItem('genres',JSON.stringify(data))
    updateGenres(data)
  }
  const setYears=(data)=>{
    localStorage.setItem('years',JSON.stringify(data))
    updateYears(data)
  }
  const setTopMovies=(data)=>{
    localStorage.setItem('topmovies',JSON.stringify(data))
    updateTopMovies(data)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout ,setStorage,storage,loading,startLoad,stopLoad,setNavbar,navbar,setGenres,genres,setYears,years,topmovies,setTopMovies}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
