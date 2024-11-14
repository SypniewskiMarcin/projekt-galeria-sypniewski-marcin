// src/components/Header.js
import React from "react";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import "./Header.css"; // Stylowanie dla nagłówka

const Header = ({ user, onLogout }) => {
    const handleLogoutClick = async () => {
        try {
            await signOut(auth);
            onLogout(); // Funkcja przekazana z App.js
        } catch (error) {
            console.error("Błąd wylogowania:", error);
        }
    };

    return (
        <header className="App-header">
            <h1>Galeria Zdjęć</h1>
            {user && (
                <button className="logout-button" onClick={handleLogoutClick}>
                    Wyloguj <i className="logout-icon">🔓</i>
                </button>
            )}
        </header>
    );
};

export default Header;
