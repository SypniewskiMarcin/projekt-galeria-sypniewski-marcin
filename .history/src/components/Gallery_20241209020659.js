// src/components/Gallery.js
import React, { useState, useEffect } from "react";
import ImageModal from "./ImageModal";
import Alert from "./Alert"; // Importuj komponent Alert
import { storage, auth } from '../firebaseConfig'; // Importuj storage i auth
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import "./Gallery.css";

function Gallery() {
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [images, setImages] = useState([]);
    const [uploadError, setUploadError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null); // Stan do przechowywania wybranego pliku
    const [alertMessage, setAlertMessage] = useState(''); // Stan do przechowywania komunikatu alertu

    // Generowanie tablicy obrazków o nazwach 1-29
    useEffect(() => {
        const imageArray = [];
        for (let i = 1; i <= 29; i++) {
            imageArray.push(
                `https://raw.githubusercontent.com/SypniewskiMarcin/projekt-galeria-sypniewski-marcin/refs/heads/main/public/images/2024-11-05_fot_marcin-sypniewski_@pierwiastek-${i}.jpg`)
        }
        setImages(imageArray);
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
    const uploadFile = async (file, albumId) => {
        const userId = auth.currentUser.uid;
        const storageRef = ref(storage, `images/${userId}/${albumId}/${file.name}`); // Dodaj albumId do ścieżki

        try {
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            // Dodaj URL do albumu w Firestore
            const albumRef = doc(db, 'albums', albumId);
            await updateDoc(albumRef, {
                images: arrayUnion(url) // Dodaj URL do tablicy zdjęć
            });
            setAlertMessage('Plik wysłany pomyślnie!');
        } catch (error) {
            console.error('Błąd przesyłania pliku:', error);
            setUploadError('Błąd przesyłania pliku. Spróbuj ponownie.');
        }
    };

    // Funkcja do pobierania URL pliku
    const getFileUrl = (fileName) => {
        const userId = auth.currentUser.uid; // Pobierz userId
        const fileRef = ref(storage, `images/${userId}/${fileName}`);

        getDownloadURL(fileRef)
            .then((url) => {
                console.log('File available at', url);
                // Możesz użyć tego URL do wyświetlenia obrazu w aplikacji
                setImages(prevImages => [...prevImages, url]); // Dodaj nowy URL do tablicy obrazków
            })
            .catch((error) => {
                console.error('Error getting file URL:', error);
            });
    };

    return (
        <main>
            <div className="upload-container">
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
                        if (selectedFile) {
                            uploadFile(selectedFile); // Wywołaj funkcję przesyłania pliku
                        } else {
                            setUploadError('Proszę wybrać plik przed wysłaniem.'); // Komunikat o błędzie
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
