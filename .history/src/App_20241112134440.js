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
      <Header onLogout={handleLogout} isLoggedIn={isLoggedIn} />
      {isLoggedIn ? (
        <Gallery />
      ) : (
        <Login onLogin={handleLogin} />
      )}
      <Footer />
    </div>
  );
}

export default App;
