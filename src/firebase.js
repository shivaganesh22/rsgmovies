// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from 'firebase/messaging';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC64M8q8Pu5v36rDP2UR9zHMHIIstywcMs",
  authDomain: "rsg-movies-f4edc.firebaseapp.com",
  projectId: "rsg-movies-f4edc",
  storageBucket: "rsg-movies-f4edc.appspot.com",
  messagingSenderId: "568992519357",
  appId: "1:568992519357:web:82a02091f0158b3ef513d4"
};
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
//....
export const generateToken = async () => {
  const permission = await Notification.requestPermission();
  if (permission == "granted") {

    const token = await getToken(messaging, { vapidKey: "BACo2ZUFUi8RATi9827omEBdMgQdxsz_RdW9mmfmZ3uDYIhuC52_O0trtLq3CHCOf8d9WwN1IMy8MlrWp5VzOHU" });
    // console.log(token);
    fetch('https://iid.googleapis.com/iid/v1/' + token + '/rel/topics/movies', {
      method: 'POST',
      headers: new Headers({
        'Authorization': 'key=AAAAhHqY1L0:APA91bF76GAl0BG_JOc9UNOTmQCBAA8irf_7z9zRRIr7NmvM3Gr4VYYTnHAMLb-ZP-td473Bfjek76dYR81a0xnRRFkPihOeTdA8quIotP8uw685M6ZjZJrL-jokGGreuRywtYd7JdJj'
      })
    }).then(response => {

    }).catch(error => {
      console.error(error);
    })

  }

};
