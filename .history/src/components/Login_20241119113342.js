// src/components/Login.js
import React, { useState } from 'react';
import { auth, provider } from '../firebaseConfig';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Importuj instancję Firestore

const Login = ({ onLoginSuccess }) => {
    const [error, setError] = useState('');

    const handleGoogleSignIn = async () => {
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Sprawdź, czy użytkownik już istnieje w Firestore
            const userRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                // Użytkownik nie istnieje, dodaj go do Firestore
                await setDoc(userRef, {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    role: 'user' // Domyślna rola
                });
            }

            // Sprawdź, czy użytkownik jest administratorem
            const adminRef = doc(db, 'settings', 'admin');
            const adminDoc = await getDoc(adminRef);

            // Sprawdź, czy dokument admin istnieje
            let role = 'user'; // Domyślna rola
            if (adminDoc.exists()) {
                const adminEmail = adminDoc.data().email;

                if (user.email === adminEmail) {
                    // Użytkownik jest administratorem
                    role = 'admin';
                    await setDoc(userRef, { role: 'admin' }, { merge: true });
                }
            } else {
                console.warn('Dokument admin nie istnieje w kolekcji settings.');
            }

            console.log('Zalogowano pomyślnie');
            onLoginSuccess({ ...user, role }); // Przekaż dane użytkownika i rolę do callbacka
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
