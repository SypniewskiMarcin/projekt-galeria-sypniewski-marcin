import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Gallery from './components/Gallery';
import Login from './components/Login';
import { auth } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import './App.css';
import { library } from "@fortawesome/fontawesome-svg-core";
import { faRightFromBracket, faTimes, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

library.add(faRightFromBracket, faTimes, faChevronLeft, faChevronRight);

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Sprawdzamy, czy użytkownik jest zalogowany
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Pobierz dane użytkownika z Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        setUser({ ...currentUser, role: userDoc.data().role }); // Ustaw użytkownika w stanie z rolą
      } else {
        setUser(null); // Ustaw użytkownika na null, jeśli brak
      }
    });

    // Zwracamy funkcję czyszczącą subskrypcję
    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData); // Ustaw użytkownika po zalogowaniu
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
