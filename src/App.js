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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        const role = userDoc.exists() ? userDoc.data().role : 'user';
        console.log('Zalogowany użytkownik:', {
          email: currentUser.email,
          role: role,
          uid: currentUser.uid
        });
        setUser({ ...currentUser, role });
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = async (userData) => {
    const userRef = doc(db, 'users', userData.uid);
    const userDoc = await getDoc(userRef);
    const role = userDoc.exists() ? userDoc.data().role : 'user';
    setUser({ ...userData, role });
  };

  return (
    <div className="App">
      <Header user={user} onLogout={() => setUser(null)} />
      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Gallery user={user} />
      )}
      <Footer />
    </div>
  );
}

export default App;