const firebaseConfig = {
    apiKey: "AIzaSyBnxa5QbhfrD_8LTrZbrmjI5wVRKHSXGLg",
    authDomain: "gartictwo.firebaseapp.com",
    databaseURL: "https://gartictwo-default-rtdb.firebaseio.com",
    projectId: "gartictwo",
    storageBucket: "gartictwo.firebasestorage.app",
    messagingSenderId: "602694382683",
    appId: "1:602694382683:web:1dc11cb6b715944ba0fb7e"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
