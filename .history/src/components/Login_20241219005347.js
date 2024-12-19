// src/components/Login.js
import React, { useState } from 'react';
import { signInWithGoogle } from '../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const Login = ({ onLoginSuccess }) => {
    const [error, setError] = useState('');

    const handleGoogleSignIn = async () => {
        try {
            const user = await signInWithGoogle();

            // Sprawdź, czy użytkownik jest administratorem
            const adminRef = doc(db, 'settings', 'admin');
            const adminDoc = await getDoc(adminRef);

            let role = 'user';
            if (adminDoc.exists()) {
                const adminEmail = adminDoc.data().email;
                if (user.email === adminEmail) {
                    role = 'admin';
                    await setDoc(doc(db, 'users', user.uid), { role: 'admin' }, { merge: true });
                }
            }

            console.log('Zalogowano pomyślnie');
            onLoginSuccess({ ...user, role });
        } catch (error) {
            console.error('Błąd logowania:', error);
            setError('Wystąpił błąd podczas logowania. Spróbuj ponownie.');
        }
    };

    return (
        <div className="login-container">
            <h2>Zaloguj się</h2>
            <button
                className="login-button"
                onClick={handleGoogleSignIn}
                tabIndex={0}
                aria-label="Zaloguj się przez Google"
            >
                Zaloguj się przez Google
            </button>
            {error && <p className="error-message" role="alert">{error}</p>}
        </div>
    );
};

export default Login;
