import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ImageModal from './ImageModal';
import Alert from './Alert';
import './AlbumView.css';

const AlbumView = ({ albumId, onBack }) => {
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadError, setUploadError] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [isAuthor, setIsAuthor] = useState(false);

    useEffect(() => {
        const fetchAlbum = async () => {
            try {
                setLoading(true);
                const albumRef = doc(db, 'albums', albumId);
                const albumDoc = await getDoc(albumRef);
                
                if (albumDoc.exists()) {
                    const albumData = { id: albumDoc.id, ...albumDoc.data() };
                    setAlbum(albumData);
                    
                    // Sprawdź czy zalogowany użytkownik jest autorem
                    const currentUser = auth.currentUser;
                    setIsAuthor(currentUser && albumData.author.uid === currentUser.uid);
                } else {
                    setError('Album nie został znaleziony');
                }
            } catch (err) {
                setError('Wystąpił błąd podczas ładowania albumu');
                console.error('Błąd:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAlbum();
    }, [albumId]);

    const uploadPhoto = async (file) => {
        try {
            if (!album || !auth.currentUser) {
                throw new Error('Brak danych albumu lub użytkownika');
            }

            // Sprawdź uprawnienia
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const userDoc = await getDoc(userRef);
            const isAdmin = userDoc.exists() && userDoc.data().role === 'admin';
            const isAuthor = album.author.uid === auth.currentUser.uid;

            if (!isAdmin && !isAuthor) {
                throw new Error('Brak uprawnień do dodawania zdjęć do tego albumu');
            }

            console.log('Uprawnienia użytkownika:', {
                isAdmin,
                isAuthor,
                userId: auth.currentUser.uid,
                albumAuthorId: album.author.uid
            });

            const timestamp = new Date().getTime();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileName = `${timestamp}_${safeFileName}`;
            
            const storagePath = `albums/${albumId}/${fileName}`;
            console.log('Ścieżka zapisu:', storagePath);
            
            const storageRef = ref(storage, storagePath);

            // Dodaj metadane do pliku
            const metadata = {
                customMetadata: {
                    uploadedBy: auth.currentUser.uid,
                    albumId: albumId,
                    timestamp: timestamp.toString()
                }
            };

            const uploadTask = await uploadBytes(storageRef, file, metadata);
            console.log('Upload zakończony:', uploadTask);
            
            const photoUrl = await getDownloadURL(storageRef);
            console.log('URL zdjęcia:', photoUrl);

            const photoData = {
                id: `photo_${timestamp}`,
                url: photoUrl,
                fileName: fileName,
                uploadedBy: auth.currentUser.uid,
                uploadedAt: new Date().toISOString(),
                description: ''
            };

            const albumRef = doc(db, 'albums', albumId);
            await updateDoc(albumRef, {
                photos: arrayUnion(photoData)
            });

            // Odśwież dane albumu
            const updatedAlbumDoc = await getDoc(albumRef);
            setAlbum({ id: updatedAlbumDoc.id, ...updatedAlbumDoc.data() });
            
            setAlertMessage('Zdjęcie zostało dodane pomyślnie!');
            setSelectedFile(null);
            document.getElementById('albumFileInput').value = '';
        } catch (error) {
            console.error('Szczegóły błędu:', {
                code: error.code,
                message: error.message,
                serverResponse: error.serverResponse,
                stack: error.stack
            });
            setUploadError(`Błąd podczas przesyłania zdjęcia: ${error.message}`);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                setSelectedFile(file);
                setUploadError('');
            } else {
                setUploadError('Proszę wybrać plik graficzny.');
                e.target.value = '';
            }
        }
    };

    if (loading) {
        return <div className="loading">Ładowanie albumu...</div>;
    }

    if (error) {
        return (
            <div className="error-container">
                <p>{error}</p>
                <button onClick={onBack} className="back-button">
                    Powrót do galerii
                </button>
            </div>
        );
    }

    return (
        <div className="album-view">
            <div className="album-header">
                <button onClick={onBack} className="back-button">
                    ← Powrót do galerii
                </button>
                <h2>{album?.name}</h2>
                <div className="album-info">
                    <p>Autor: {album?.author?.displayName}</p>
                    {album?.location && <p>Lokalizacja: {album?.location}</p>}
                    <p>Data utworzenia: {new Date(album?.createdAt).toLocaleDateString()}</p>
                </div>
            </div>

            {isAuthor && (
                <div className="upload-section">
                    <input
                        type="file"
                        id="albumFileInput"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="file-input"
                    />
                    <button
                        onClick={() => {
                            if (selectedFile) {
                                uploadPhoto(selectedFile);
                            } else {
                                setUploadError('Proszę wybrać plik przed wysłaniem.');
                            }
                        }}
                        className="upload-button"
                        disabled={!selectedFile}
                    >
                        Dodaj zdjęcie do albumu
                    </button>
                    {uploadError && <p className="error-message">{uploadError}</p>}
                </div>
            )}

            {alertMessage && (
                <Alert 
                    message={alertMessage} 
                    onClose={() => setAlertMessage('')}
                    type="success"
                />
            )}

            {album?.photos?.length > 0 ? (
                <div className="album-photos">
                    {album.photos.map((photo, index) => (
                        <div 
                            key={photo.id} 
                            className="photo-item"
                            onClick={() => setSelectedImageIndex(index)}
                        >
                            <img 
                                src={photo.url} 
                                alt={photo.description || `Zdjęcie ${index + 1}`} 
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-album">
                    <p>Ten album jest pusty</p>
                </div>
            )}

            {selectedImageIndex !== null && album?.photos?.length > 0 && (
                <ImageModal
                    imageUrl={album.photos[selectedImageIndex].url}
                    onClose={() => setSelectedImageIndex(null)}
                    onPrev={() => setSelectedImageIndex(prev => 
                        prev > 0 ? prev - 1 : album.photos.length - 1
                    )}
                    onNext={() => setSelectedImageIndex(prev => 
                        prev < album.photos.length - 1 ? prev + 1 : 0
                    )}
                />
            )}
        </div>
    );
};

export default AlbumView; 