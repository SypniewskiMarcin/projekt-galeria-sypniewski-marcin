import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '@/firebaseConfig';
import { User } from '@/types';

interface NavigationProps {
  user: User | null;
}

const Navigation: React.FC<NavigationProps> = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Błąd podczas wylogowywania:', error);
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <Link to="/">Galeria Zdjęć</Link>
      </div>
      
      <div className="nav-links">
        {user ? (
          <>
            <Link to="/" className="nav-link">
              Galeria
            </Link>
            <Link to="/profile" className="nav-link">
              Profil
            </Link>
            {user.role === 'admin' && (
              <Link to="/admin" className="nav-link">
                Panel Admina
              </Link>
            )}
            <button onClick={handleLogout} className="logout-button">
              Wyloguj
            </button>
          </>
        ) : (
          <Link to="/login" className="nav-link">
            Zaloguj
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navigation; 