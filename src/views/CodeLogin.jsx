import React,{useEffect, useState} from 'react'
import { useNavigate,Link } from 'react-router-dom';
import { useAuth } from './other/AuthContext';
import { toastSuccess, toastWarning } from './components/Notifications';
import MyLoader from './MyLoader';
export default function CodeLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate=useNavigate();
    const {  login,startLoad,stopLoad  } = useAuth();
    const handleLogin = async (event) => {
        event.preventDefault();
        startLoad();
        try {
          const response = await fetch(`https://rsg-movies.vercel.app/react/jwt/login/code/${email}/`, {
            method: 'GET',
          });
    
          const result = await response.json();
          if (response.status==200){
            localStorage.setItem('session',result.session)
            localStorage.setItem('rsg',result.rsg)
            navigate('/');
            toastSuccess('Login Success')
            login();    
          }

          else{
            toastWarning(result["error"])
          }
        } catch (error) {
          console.error('Error during login:', error);
        }
        stopLoad();
      };
   
      
   useEffect(()=>{
    if(localStorage.getItem('session')!=null) navigate('/')
   },)
  return (
    <main>

    
    <section className="">
    <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto ">
    
        <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
        <MyLoader>
            <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
                <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white text-center">
                    Code Login
                </h1>
                
                <form className="space-y-4 md:space-y-6" onSubmit={handleLogin} >
                    <div>
                        <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your code</label>
                        <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} name="email" id="email" className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="******" required/>
                    </div>
                  
                    
                    <button type="submit"  className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800">Submit</button>
                    
                </form>
               
            </div>
            </MyLoader>
        </div>
        
    </div>
   
  </section>
  </main>
  )
}
