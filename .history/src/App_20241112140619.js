// src/App.js
import React, { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Gallery from './components/Gallery';
import Login from './components/Login';
import { auth } from './firebaseConfig';
import { signOut } from 'firebase/auth';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  const handleLoginSuccess = () => {
    setUser(auth.currentUser); // Ustaw użytkownika po zalogowaniu
  };

  const handleLogout = () => {
    setUser(null); // Rweset użytkownika po wylogowaniu
    console.log('Wylogowano pomyślnie');
  };

  return (
    <div className="App">
      <Header user={user} onLogout={handleLogout} />
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
