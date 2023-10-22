import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// SAFE TO KEEP ON CLIENT
const firebaseConfig = {
  apiKey: "AIzaSyA5AvUzPyTdrkyaZkxm5_iSRjdn3MC9dBE",
  authDomain: "collab-club-6dc4d.firebaseapp.com",
  projectId: "collab-club-6dc4d",
  storageBucket: "collab-club-6dc4d.appspot.com",
  messagingSenderId: "897652884505",
  appId: "1:897652884505:web:0786c89864aa4635e41688",
  measurementId: "G-180SQY8NM6",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const functions = getFunctions(firebaseApp);
export const db = getFirestore(firebaseApp);