// Importowanie funkcji do inicjalizacji aplikacji Firebase
import { initializeApp } from "firebase/app";
// Importowanie funkcji do obsługi uwierzytelniania oraz dostawcy Google
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Konfiguracja aplikacji Firebase - zastąp wartości odpowiednimi danymi z Firebase Console
const firebaseConfig = {
    apiKey: "YOUR_API_KEY", // Klucz API dla Twojej aplikacji Firebase
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com", // Domena autoryzacji projektu
    projectId: "YOUR_PROJECT_ID", // ID projektu w Firebase
    storageBucket: "YOUR_PROJECT_ID.appspot.com", // Bucket do przechowywania danych
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // ID nadawcy dla usług wiadomości
    appId: "YOUR_APP_ID" // ID aplikacji dla aplikacji Firebase
};

// Inicjalizacja aplikacji Firebase z użyciem konfiguracji
const app = initializeApp(firebaseConfig);
// Inicjalizacja instancji uwierzytelniania
const auth = getAuth(app);
// Utworzenie instancji dostawcy Google do logowania
const provider = new GoogleAuthProvider();

// Eksportowanie instancji uwierzytelniania i dostawcy, aby mogły być używane w innych plikach
export { auth, provider };
