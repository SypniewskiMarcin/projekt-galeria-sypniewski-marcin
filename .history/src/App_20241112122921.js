// src/App.js
import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Gallery from "./components/Gallery";
import Login from "./components/Login"; // Import komponentu logowania
import { auth } from "./firebaseConfig"; // Import instancji auth z konfiguracji Firebase
import "./App.css"; // Zaimportowanie stylów

function App() {
  const [user, setUser] = useState(null); // Stan do przechowywania informacji o użytkowniku

  // Ustawienie obserwatora zmian stanu uwierzytelnienia
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe(); // Czyszczenie obserwatora przy odmontowaniu komponentu
  }, []);

  return (
    <div className="App">
      <Header /> {/* Komponent nagłówka */}
      {user ? (
        <div>
          <p>Witaj, {user.displayName}!</p>
          <button onClick={() => auth.signOut()}>Wyloguj się</button>
        </div>
      ) : (
        <Login setUser={setUser} /> // Przekazanie funkcji setUser do komponentu Login
      )}
      <Gallery /> {/* Komponent galerii */}
      <Footer /> {/* Komponent stopki */}
    </div>
  );
}

export default App;




// // src/App.js
// import React from 'react';
// import Header from './components/Header';
// import Footer from './components/Footer';
// import Gallery from './components/Gallery';
// import './App.css';  // Stylizacja (jeśli chcesz dodać CSS)

// function App() {
//   return (
//     <div className="App">
//       <Header />
//       <Gallery />
//       <Footer />
//     </div>
//   );
// }

// export default App;


////////////////////////////////////////////////////////////
//below old code
////////////////////////////////////////////////////////////

// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;
