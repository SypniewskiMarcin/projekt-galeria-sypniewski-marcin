// src/components/Login.js
import React, { useState } from 'react';
import { auth, provider } from '../firebaseConfig';
import { signInWithPopup } from 'firebase/auth';

const Login = ({ onLoginSuccess }) => {
    const [error, setError] = useState('');

    const handleGoogleSignIn = async () => {
        try {
            await signInWithPopup(auth, provider);
            console.log('Zalogowano pomyślnie');
            onLoginSuccess(); // Po zalogowaniu wykonaj callback
        } catch (error) {
            setError(error.message); // Ustaw komunikat o błędzie
            console.error('Błąd logowania:', error);
        }
    };

    return (
        <div className="login-container">
            <h2>Zaloguj się</h2>
            <button className="login-button" onClick={handleGoogleSignIn}>
                Zaloguj się przez Google
            </button>
            {error && <p className="error-message">{error}</p>} {/* Wyświetl błąd, jeśli wystąpił */}
        </div>
    );
};

export default Login;
