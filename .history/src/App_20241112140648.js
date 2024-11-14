// src/App.js
import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Gallery from './components/Gallery';
import Login from './components/Login'; // Import komponentu logowania
import { auth } from './firebaseConfig';
import { signOut } from 'firebase/auth';
import './App.css'; // Zaimportowanie stylów

function App() {
  const [user, setUser] = useState(null);

  const handleLoginSuccess = () => {
    setUser(auth.currentUser); // Ustaw użytkownika po zalogowaniu
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null); // Wyloguj i ustaw stan użytkownika na null
      console.log('Wylogowano pomyślnie');
    } catch (error) {
      console.error('Błąd wylogowania:', error);
    }
  };

  return (
    <div className="App">
      <Header /> {/* Komponent nagłówka */}
      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} /> // Wyświetl login, jeśli użytkownik nie jest zalogowany
      ) : (
        <>
          <Gallery /> {/* Komponent galerii */}
          <button className="logout-button" onClick={handleLogout}>Wyloguj się</button> {/* Przycisk wylogowania */}
        </>
      )}
      <Footer /> {/* Komponent stopki */}
    </div>
  );
}

export default App;
