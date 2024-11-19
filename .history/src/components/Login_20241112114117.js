import React, { useState } from 'react';
import { auth, provider } from '../firebaseConfig';
import { signInWithPopup } from 'firebase/auth';

const Login = () => {
    const [error, setError] = useState('');

    const handleGoogleSignIn = async () => {
        try {
            await signInWithPopup(auth, provider);
            console.log('Zalogowano pomyślnie');
        } catch (error) {
            setError(error.message);
            console.error('Błąd logowania:', error);
        }
    };

    return (
        <div>
            <h2>Zaloguj się</h2>
            <button onClick={handleGoogleSignIn}>Zaloguj się przez Google</button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default Login;
