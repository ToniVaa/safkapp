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

// HUOM! Korvaa alla olevat paikkamerkit omilla Firebase-projektisi tiedoilla.
// Löydät nämä tiedot Firebase Consolen Project settings -sivulta.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
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
