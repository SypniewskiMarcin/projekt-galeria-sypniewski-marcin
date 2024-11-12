// src/components/Header.js
import React from 'react';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import './Header.css'; // Styl komponentu

const Header = ({ onLogout }) => {
    const handleLogout = async () => {
        try {
            await signOut(auth);
            console.log('Wylogowano pomyślnie');
            onLogout(); // Wykonanie callbacku po wylogowaniu
        } catch (error) {
            console.error('Błąd wylogowania:', error);
        }
    };

    return (
        <header className="App-header">
            <h1>Galeria</h1>
            <button className="logout-button" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i> {/* Ikona FontAwesome */}
            </button>
        </header>
    );
};

export default Header;
