import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '@/firebaseConfig';

const Login = () => {
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (error) {
      setError('Wystąpił błąd podczas logowania. Spróbuj ponownie.');
      console.error('Błąd logowania:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Zaloguj się</h2>
          <p className="mt-2 text-gray-600">do Galerii Zdjęć</p>
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <img
            src="https://www.google.com/favicon.ico"
            alt="Google"
            className="w-5 h-5 mr-2"
          />
          Zaloguj się przez Google
        </button>
      </div>
    </div>
  );
};

export default Login; 