// src/App.js
import React from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Gallery from "./components/Gallery";
import Login from "./components/Login"; // Import komponentu logowania
import "./App.css"; // Zaimportowanie stylów

function App() {
  return (
    <div className="App">
      <Header /> {/* Komponent nagłówka */}
      <Login /> {/* Komponent logowania */}
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
