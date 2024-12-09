// src/components/Gallery.js
import React, { useState, useEffect } from "react";
import ImageModal from "./ImageModal";
import Alert from "./Alert"; // Importuj komponent Alert
import { storage, auth, db } from '../firebaseConfig'; // Importuj storage, auth i db
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import "./Gallery.css";

function Gallery() {
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [images, setImages] = useState([]);
    const [uploadError, setUploadError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null); // Stan do przechowywania wybranego pliku
    const [alertMessage, setAlertMessage] = useState(''); // Stan do przechowywania komunikatu alertu
    const [albums, setAlbums] = useState([]); // Stan do przechowywania albumów
    const [selectedAlbumId, setSelectedAlbumId] = useState(null); // ID wybranego albumu

    // // Generowanie tablicy obrazków o nazwach 1-29 ---- wczytywanie obrazkow z github
    // useEffect(() => {
    //     const imageArray = [];
    //     for (let i = 1; i <= 29; i++) {
    //         imageArray.push(
    //             `https://raw.githubusercontent.com/SypniewskiMarcin/projekt-galeria-sypniewski-marcin/refs/heads/main/public/images/2024-11-05_fot_marcin-sypniewski_@pierwiastek-${i}.jpg`)
    //     }
    //     setImages(imageArray);
    // }, []);

    useEffect(() => {
        const fetchAlbums = async () => {
            const albumsCollection = collection(db, 'albums');
            const albumsSnapshot = await getDocs(albumsCollection);
            const albumsList = albumsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAlbums(albumsList);
        };

        fetchAlbums();
    }, []);

    const handlePrev = () => {
        setSelectedImageIndex(prevIndex =>
            prevIndex > 0 ? prevIndex - 1 : images.length - 1
        );
    };

    const handleNext = () => {
        setSelectedImageIndex(prevIndex =>
            prevIndex < images.length - 1 ? prevIndex + 1 : 0
        );
    };

    // Funkcja do przesyłania plików
    const uploadFile = async (file) => {
        const userId = auth.currentUser.uid; // Pobierz userId z Firebase Authentication
        const storageRef = ref(storage, `images/${userId}/${selectedAlbumId}/${file.name}`); // Dodaj albumId do ścieżki

        try {
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            const albumRef = doc(db, 'albums', selectedAlbumId);
            await updateDoc(albumRef, {
                images: [...images, url] // Dodaj URL do tablicy zdjęć
            });
            setAlertMessage('Plik wysłany pomyślnie!'); // Ustaw komunikat o sukcesie
            setSelectedFile(null); // Wyczyść wybrane plik
            document.getElementById('fileInput').value = ''; // Wyczyść pole input
        } catch (error) {
            console.error('Error uploading file:', error);
            setUploadError('Błąd przesyłania pliku. Spróbuj ponownie.'); // Ustaw komunikat o błędzie
        }
    };

    return (
        <main>
            <div className="upload-container">
                <select onChange={(e) => setSelectedAlbumId(e.target.value)} required>
                    <option value="">Wybierz album</option>
                    {albums.map(album => (
                        <option key={album.id} value={album.id}>{album.name}</option>
                    ))}
                </select>
                <input
                    type="file"
                    id="fileInput"
                    onChange={(e) => {
                        const file = e.target.files[0];
                        setSelectedFile(file); // Ustaw wybrany plik w stanie
                    }}
                    className="file-input" // Dodaj klasę do stylizacji
                />
                <button
                    onClick={() => {
                        if (selectedFile && selectedAlbumId) {
                            uploadFile(selectedFile); // Wywołaj funkcję przesyłania pliku
                        } else {
                            setUploadError('Proszę wybrać plik i album przed wysłaniem.'); // Komunikat o błędzie
                        }
                    }}
                    className="upload-button" // Dodaj klasę do stylizacji
                >
                    Wyślij
                </button>
                {uploadError && <p className="error-message">{uploadError}</p>} {/* Wyświetl błąd, jeśli wystąpił */}
            </div>

            {/* Wyświetl alert, jeśli jest komunikat */}
            {alertMessage && <Alert message={alertMessage} onClose={() => setAlertMessage('')} />}

            <div className="gallery">
                {images.map((image, index) => (
                    <div
                        key={index}
                        className="gallery-item"
                        onClick={() => setSelectedImageIndex(index)}
                    >
                        <img src={image} alt={`Zdjęcie ${index + 1}`} />
                    </div>
                ))}
            </div>

            {selectedImageIndex !== null && (
                <ImageModal
                    imageUrl={images[selectedImageIndex]}
                    onClose={() => setSelectedImageIndex(null)}
                    onPrev={handlePrev}
                    onNext={handleNext}
                />
            )}
        </main>
    );
}

export default Gallery;
