// src/firebaseConfig.js
import { initializeApp } from "firebase/app";

const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id",
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
export default app;
