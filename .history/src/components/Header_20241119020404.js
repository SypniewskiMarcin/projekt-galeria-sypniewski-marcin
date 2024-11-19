// src/components/Header.js
import React from "react";
import { auth } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import "./Header.css"; // Stylowanie dla nagłówka
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons";

const Header = ({ user, onLogout }) => {
    const handleLogoutClick = async () => {
        const confirmLogout = window.confirm("Czy na pewno chcesz się wylogować?");
        if (confirmLogout) {
            try {
                await signOut(auth);
                onLogout(); // Funkcja przekazana z App.js
            } catch (error) {
                console.error("Błąd wylogowania:", error);
            }
        }
    };

    return (
        <header className="App-header">
            <h1>Galeria Zdjęć</h1>
            {user && (
                <button className="logout-button" onClick={handleLogoutClick}>
                    Wyloguj <FontAwesomeIcon icon={faRightFromBracket} />
                </button>
            )}
        </header>
    );
};

export default Header;
