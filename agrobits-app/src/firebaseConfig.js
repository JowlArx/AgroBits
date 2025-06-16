import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD5IOJNEV5tZk-T9iWWLl6Os57isGoKm7Q",
  authDomain: "agrobits-85dc4.firebaseapp.com",
  databaseURL: "https://agrobits-85dc4-default-rtdb.firebaseio.com",
  projectId: "agrobits-85dc4",
  storageBucket: "agrobits-85dc4.firebasestorage.app",
  messagingSenderId: "633249056873",
  appId: "1:633249056873:web:1343d46f4f955c8667faf8",
  measurementId: "G-MSMCTRSDL8"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db, firebaseConfig };