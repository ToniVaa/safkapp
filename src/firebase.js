// src/firebase.js
// Tämä tiedosto alustaa Firebase-sovelluksen ja vie tarvittavat Firestore-funktiot.

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// HUOM! Korvaa alla olevat paikkamerkit omilla Firebase-projektisi tiedoilla.
// Löydät nämä tiedot Firebase Consolen Project settings -sivulta.
const firebaseConfig = {
  apiKey: "AIzaSyCPRjPzRMiKyqye38JP6RKGP8Vy7HngCB0",
  authDomain: "safkapp-71092.firebaseapp.com",
  projectId: "safkapp-71092",
  storageBucket: "safkapp-71092.firebasestorage.app",
  messagingSenderId: "149131790240",
  appId: "1:149131790240:web:7c9502470ca8358ab106c5"
};

// Alusta Firebase-sovellus
const app = initializeApp(firebaseConfig);

// Hae Firestore-palvelu
const db = getFirestore(app);

// Vie kaikki tarvittavat funktiot, jotta niitä voidaan käyttää muissa komponenteissa.
export { 
  db, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  getDoc, 
  updateDoc 
};
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
