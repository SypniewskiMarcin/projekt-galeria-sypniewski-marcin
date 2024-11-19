import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Gallery from './components/Gallery';
import Login from './components/Login';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import './App.css';
import { library } from "@fortawesome/fontawesome-svg-core";
import { faRightFromBracket, faTimes } from "@fortawesome/free-solid-svg-icons";

library.add(faRightFromBracket, faTimes);

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Sprawdzamy, czy użytkownik jest zalogowany
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Ustawiamy użytkownika w stanie lub null, jeśli brak
    });

    // Zwracamy funkcję czyszczącą subskrypcję
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = () => {
    setUser(auth.currentUser); // Ustaw użytkownika po zalogowaniu
  };

  return (
    <div className="App">
      <Header user={user} onLogout={() => setUser(null)} />
      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Gallery />
      )}
      <Footer />
    </div>
  );
}

export default App;
