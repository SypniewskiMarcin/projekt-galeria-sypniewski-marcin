// src/components/Header.js
import React from "react";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import "./Header.css"; // Plik CSS dla stylów Header

const Header = ({ onLogout, isLoggedIn }) => {
    const handleLogoutClick = async () => {
        try {
            await signOut(auth);
            onLogout();
        } catch (error) {
            console.error("Błąd wylogowania:", error);
        }
    };

    return (
        <header className="App-header">
            <h1>Galeria Zdjęć</h1>
            {isLoggedIn && (
                <button className="logout-button" onClick={handleLogoutClick}>
                    <span className="logout-icon">🔓</span> Wyloguj się
                </button>
            )}
        </header>
    );
};

export default Header;
