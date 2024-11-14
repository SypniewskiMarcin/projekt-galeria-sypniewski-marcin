// src/App.js
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Gallery from './components/Gallery';
import Login from './components/Login'; // Import komponentu logowania
import { auth } from './firebaseConfig';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import './App.css'; // Zaimportowanie stylów

function App() {
  const [user, setUser] = useState(null);

  // Sprawdzenie stanu autentykacji użytkownika po załadowaniu komponentu
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Aktualizuj stan użytkownika
    });

    // Czyszczenie subskrypcji po zakończeniu
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth); // Wylogowanie użytkownika
      console.log('Wylogowano pomyślnie');
    } catch (error) {
      console.error('Błąd wylogowania:', error);
    }
  };

  return (
    <div className="App">
      <Header /> {/* Komponent nagłówka */}
      {!user ? (
        <Login onLoginSuccess={() => setUser(auth.currentUser)} /> // Przekazanie użytkownika po logowaniu
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
