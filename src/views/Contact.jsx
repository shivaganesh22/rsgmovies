import React ,{useState} from 'react'
import { toastSuccess, toastWarning } from './components/Notifications';
import MyLoader from './MyLoader'
import { useAuth } from './other/AuthContext';
import {useNavigate} from 'react-router-dom'
export default function Contact() {
    const {startLoad,stopLoad}=useAuth();
    const navigate=useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault();
        startLoad();
        try {
          const response = await fetch(`https://rsg-movies.vercel.app/react/contact/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
              },
            body: JSON.stringify({
             "full_name":e.target.name.value,
             "email":e.target.email.value,
             "subject":e.target.subject.value,
             "message":e.target.message.value
            }),
          });
          const result = await response.json();
          if (response.status == 200) {
            toastSuccess("Form Submitted");
            navigate('/');
          }
          else {
            toastWarning("Failed to Submit")
          }
    
        } catch (error) {
          console.error('Error fetching data:', error);
        }
        stopLoad();
      }
    return (
        <main>


            <section className="">
                <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto ">

                    <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
                        <MyLoader>
                            <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
                                <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white text-center">
                                    Report / Feedback
                                </h1>

                                <form className="max-w-sm mx-auto" onSubmit={handleSubmit}>
                                    <label htmlFor="website-admin" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Full Name</label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-e-0 border-gray-300 rounded-s-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600">
                                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 13a8.949 8.949 0 0 1-4.951-1.488A3.987 3.987 0 0 1 9 13h2a3.987 3.987 0 0 1 3.951 3.512A8.949 8.949 0 0 1 10 18Z" />
                                            </svg>
                                        </span>
                                        <input type="text" id="website-admin" className="rounded-none rounded-e-lg bg-gray-50 border border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500 block flex-1 min-w-0 w-full text-sm p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" name='name' placeholder="Name" required />
                                    </div>

                                    <label htmlFor="email-address-icon" className="block my-2 text-sm font-medium text-gray-900 dark:text-white">Your Email</label>
                                    <div className="relative mb-2">
                                        <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
                                            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 16">
                                                <path d="m10.036 8.278 9.258-7.79A1.979 1.979 0 0 0 18 0H2A1.987 1.987 0 0 0 .641.541l9.395 7.737Z" />
                                                <path d="M11.241 9.817c-.36.275-.801.425-1.255.427-.428 0-.845-.138-1.187-.395L0 2.6V14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2.5l-8.759 7.317Z" />
                                            </svg>
                                        </div>
                                        <input type="email" name='email' id="email-address-icon" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Email" required />
                                    </div>
                                    <div class="mb-2">
                                        <label for="base-input" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your Subject</label>
                                        <input type="text" name="subject" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder='Subject' />
                                    </div>
                                    <label for="message" class=" block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your message</label>
                                    <textarea name="message" rows="4" class="mb-2 block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Message"></textarea>


                                    <center>
                                        <button type="submit" className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800">Submit</button>

                                    </center>
                                    <br />

                                </form>

                            </div>
                        </MyLoader>
                    </div>

                </div>

            </section>
        </main>
    )
}
