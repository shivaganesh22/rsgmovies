import React, { createContext, useContext, useState } from 'react';


const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setLoggedIn] = useState(localStorage.getItem('token')||false);
  const [storage, updateStorage] = useState( null);
  const [loading, updateLoading] = useState(true);
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
  const setLoading = () => {
    // localStorage.setItem('storage',JSON.stringify(size))
    updateLoading(!loading);
  };
  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout ,setStorage,storage,loading,setLoading}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
