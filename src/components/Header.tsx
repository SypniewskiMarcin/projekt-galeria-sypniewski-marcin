import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '@/types';
import './Header.css';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          Galeria Zdjęć
        </Link>
        
        <nav className="navigation">
          {user ? (
            <>
              <Link to="/albums" className="nav-link">
                Albumy
              </Link>
              <Link to="/profile" className="nav-link">
                Profil
              </Link>
              <button onClick={onLogout} className="logout-button">
                Wyloguj
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-link">
              Zaloguj
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header; 