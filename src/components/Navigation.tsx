import { Link, useNavigate } from 'react-router-dom';
import { auth } from '@/firebaseConfig';
import { useAuth } from '@/hooks/useAuth';

const Navigation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Błąd podczas wylogowywania:', error);
    }
  };

  if (!user) return null;

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex space-x-4">
            <Link 
              to="/" 
              className="text-gray-700 hover:text-blue-500 px-3 py-2 rounded-md text-sm font-medium"
            >
              Galeria
            </Link>
            <Link 
              to="/albums" 
              className="text-gray-700 hover:text-blue-500 px-3 py-2 rounded-md text-sm font-medium"
            >
              Albumy
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              to="/profile" 
              className="text-gray-700 hover:text-blue-500 px-3 py-2 rounded-md text-sm font-medium"
            >
              Profil
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 