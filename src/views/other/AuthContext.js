import React, { createContext, useContext, useState } from 'react';
import { json } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setLoggedIn] = useState(localStorage.getItem('token')||false);
  const [storage, updateStorage] = useState(JSON.parse(localStorage.getItem("storage")) || null);
  const login = () => {
    // Perform login logic
    setLoggedIn(true);
  };

  const logout = () => {
    // Perform logout logic
    setLoggedIn(false);
  };
  const setStorage = (size) => {
    localStorage.setItem('storage',JSON.stringify(size))
    updateStorage(size);
  };
  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout ,setStorage,storage}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
