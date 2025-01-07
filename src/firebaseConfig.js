// Importowanie funkcji z SDK Firebase
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Konfiguracja Firebase - skopiowana z Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyAE6S9fI8SYxBTIcm7gCI3cOTrQkKWJRxw",
    authDomain: "projekt-galeria-sypniewski-m.firebaseapp.com",
    projectId: "projekt-galeria-sypniewski-m",
    storageBucket: "projekt-galeria-sypniewski-m.firebasestorage.app",
    messagingSenderId: "965126286990",
    appId: "1:965126286990:web:838ac7b5c34b09d90ba3df",
    measurementId: "G-J180LR3YQF"
};

// Inicjalizacja aplikacji Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const storage = getStorage(app);
const db = getFirestore(app);

// Inicjalizacja Functions z prawidłową konfiguracją regionu
const functions = getFunctions(app, "europe-central2");

// Eksportowanie funkcji
export { auth, provider, storage, db, functions };
export default app;
