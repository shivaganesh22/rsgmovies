

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');


firebase.initializeApp({
    apiKey: "AIzaSyC64M8q8Pu5v36rDP2UR9zHMHIIstywcMs",
    authDomain: "rsg-movies-f4edc.firebaseapp.com",
    projectId: "rsg-movies-f4edc",
    storageBucket: "rsg-movies-f4edc.appspot.com",
    messagingSenderId: "568992519357",
    appId: "1:568992519357:web:82a02091f0158b3ef513d4"
});

const messaging = firebase.messaging();

// Handle background messages

messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.data.title;
    const notificationOptions = {
        body: payload.data.body,
        icon:payload.data.image,
        image:payload.data.image,
        data:payload.data
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});


// Handle notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.link));
});
