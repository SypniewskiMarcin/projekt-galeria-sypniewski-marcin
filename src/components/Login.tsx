import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, provider, db } from '@/firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from '@/types';

const Login: React.FC = () => {
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Sprawdź czy użytkownik istnieje w bazie
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Jeśli nie istnieje, stwórz nowego użytkownika
        await setDoc(userRef, {
          id: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: 'user',
          createdAt: new Date(),
          lastLogin: new Date()
        } as User);
      } else {
        // Aktualizuj datę ostatniego logowania
        await setDoc(userRef, {
          lastLogin: new Date()
        }, { merge: true });
      }

      navigate('/');
    } catch (err) {
      setError('Wystąpił błąd podczas logowania. Spróbuj ponownie.');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Zaloguj się do aplikacji
          </h2>
        </div>
        
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <img 
            src="/google-icon.png" 
            alt="Google" 
            className="w-5 h-5 mr-2"
          />
          Zaloguj się przez Google
        </button>

        {error && (
          <div className="mt-4 text-center text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login; 