import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Gallery from './components/Gallery';
import Login from './components/Login';
import { auth } from './firebaseConfig';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Sprawdzamy, czy użytkownik jest zalogowany
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser); // Jeśli użytkownik jest zalogowany, ustawiamy go w stanie
      } else {
        setUser(null); // Jeśli nie ma zalogowanego użytkownika, ustawiamy stan na null
      }
    });

    // Zwracamy funkcję czyszczącą subskrypcję
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = () => {
    setUser(auth.currentUser); // Ustaw użytkownika po zalogowaniu
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null); // Wylogowanie użytkownika
      console.log('Wylogowano pomyślnie');
    } catch (error) {
      console.error('Błąd wylogowania:', error);
    }
  };

  return (
    <div className="App">
      <Header user={user} onLogout={handleLogout} />
      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          <Gallery />
          <button className="logout-button" onClick={handleLogout}>Wyloguj się</button>
        </>
      )}
      <Footer />
    </div>
  );
}

export default App;
