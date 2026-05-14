import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC05CGSZAIatme9e1489qyVQrAoswNBNAY",
  authDomain: "myhq-gaming-platform.firebaseapp.com",
  databaseURL: "https://myhq-gaming-platform-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "myhq-gaming-platform",
  storageBucket: "myhq-gaming-platform.appspot.com",
  messagingSenderId: "589206602464",
  appId: "1:589206602464:web:7653c81be59f6fd7eb8685",
  measurementId: "G-QKPNBYSJ1H"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app); // Storage Enabled

export const GAMES = [
    { id: 'bingo', name: 'Bingo', url: 'https://bingo-final.vercel.app/' },
    { id: 'word-trial', name: 'Word Trial', url: 'https://myhq-word-trial-game.vercel.app/' },
    { id: 'clue-cascade', name: 'Clue Cascade', url: 'https://clue-cascade-game.vercel.app/' },
    { id: 'feud', name: 'Family Feud', url: 'https://family-feud-game-ashen.vercel.app/' },
    { id: 'anagram', name: 'Anagram', url: 'https://anagram-game-xi.vercel.app/' }
];