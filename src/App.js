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
import ImageEditor from './components/ImageEditor';
import AlbumView from './components/AlbumView';

library.add(faRightFromBracket, faTimes, faChevronLeft, faChevronRight);

function App() {
  const [user, setUser] = useState(null);
  const [editingImages, setEditingImages] = useState(null);
  const [selectedAlbumId, setSelectedAlbumId] = useState(null);

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

  const handleStartEditing = (photos) => {
    console.log('handleStartEditing wywołane z photos:', photos);
    const imagesToEdit = photos.map(photo => ({
      id: photo.id,
      url: photo.url,
      fileName: photo.fileName || 'image.jpg'
    }));
    
    console.log('Przygotowane zdjęcia do edycji:', imagesToEdit);
    setEditingImages(imagesToEdit);
    
    console.log('Stan editingImages po ustawieniu:', imagesToEdit);
  };

  const handleSaveEditedImage = async (index, editedImageUrl) => {
    try {
      console.log('Zapisywanie edytowanego zdjęcia:', {
        index,
        editedImageUrl
      });
      
      setEditingImages(null);
    } catch (error) {
      console.error('Błąd podczas zapisywania edytowanego zdjęcia:', error);
    }
  };

  useEffect(() => {
    console.log('Stan editingImages się zmienił:', editingImages);
  }, [editingImages]);

  return (
    <div className="App">
      <Header user={user} onLogout={() => setUser(null)} />
      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          {selectedAlbumId ? (
            <AlbumView 
              albumId={selectedAlbumId} 
              onBack={() => setSelectedAlbumId(null)}
              onStartEditing={handleStartEditing}
            />
          ) : (
            <Gallery 
              user={user} 
              onAlbumSelect={setSelectedAlbumId}
            />
          )}
          {editingImages && editingImages.length > 0 && (
            <ImageEditor
              images={editingImages}
              onClose={() => {
                console.log('Zamykanie edytora');
                setEditingImages(null);
              }}
              onSave={handleSaveEditedImage}
              isOpen={true}
            />
          )}
        </>
      )}
      <Footer />
    </div>
  );
}

export default App;