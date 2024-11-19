// Importowanie funkcji z SDK Firebase
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { ref, uploadBytes } from 'firebase/storage';

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

// Inicjalizacja usług Firebase
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const storage = getStorage(app);
const db = getFirestore(app);

const uploadFile = (file) => {
    const userId = auth.currentUser.uid; // Pobierz userId z Firebase Authentication
    const storageRef = ref(storage, `images/${userId}/${file.name}`);

    uploadBytes(storageRef, file).then((snapshot) => {
        console.log('Uploaded a blob or file!', snapshot);
    }).catch((error) => {
        console.error('Error uploading file:', error);
    });
};

// Eksportowanie funkcji
export { auth, provider, storage, db };
