// src/App.js
import React, { useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Gallery from "./components/Gallery";
import Login from "./components/Login";
import "./App.css"; // Zaimportowanie stylów

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <div className="App">
      <Header onLogout={handleLogout} /> {/* Komponent nagłówka z funkcjonalnością wylogowania */}
      {isLoggedIn ? (
        <Gallery /> // Komponent galerii widoczny po zalogowaniu
      ) : (
        <Login onLogin={handleLogin} /> // Komponent logowania
      )}
      <Footer /> {/* Komponent stopki */}
    </div>
  );
}

export default App;
