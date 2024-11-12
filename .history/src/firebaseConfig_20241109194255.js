// Importowanie funkcji z SDK Firebase
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

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
const analytics = getAnalytics(app);

// Ustawienie autoryzacji
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Eksportowanie funkcji
export { auth, provider };
