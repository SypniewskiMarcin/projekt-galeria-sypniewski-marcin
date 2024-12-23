import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ImageModal from './ImageModal';
import Alert from './Alert';
import './AlbumView.css';
import JSZip from 'jszip';
import PaymentProcess from './PaymentProcess';

const AlbumView = ({ albumId, onBack }) => {
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadError, setUploadError] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [isAuthor, setIsAuthor] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState(new Set());
    const [showPaymentProcess, setShowPaymentProcess] = useState(false);
    const [isFullAlbumPurchase, setIsFullAlbumPurchase] = useState(false);

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

            console.log('Rozpoczynam upload:', {
                albumId,
                currentUser: auth.currentUser.uid,
                isAuthenticated: !!auth.currentUser,
                file: {
                    name: file.name,
                    size: file.size,
                    type: file.type
                }
            });

            const timestamp = new Date().getTime();
            const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const fileName = `${timestamp}_${safeFileName}`;
            const storagePath = `albums/${albumId}/${fileName}`;

            console.log('Ścieżka zapisu:', storagePath);
            
            const storageRef = ref(storage, storagePath);
            
            // Dodaj metadane
            const metadata = {
                contentType: file.type,
                customMetadata: {
                    albumId: albumId,
                    uploadedBy: auth.currentUser.uid,
                    uploadedAt: new Date().toISOString()
                }
            };

            const uploadTask = await uploadBytes(storageRef, file, metadata);
            console.log('Upload zakończony:', uploadTask);
            
            const photoUrl = await getDownloadURL(storageRef);
            
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

    // Funkcja do sprawdzania czy album można pobrać
    const isDownloadable = album => {
        return album?.isPublic && !album?.isCommercial;
    };

    // Funkcja do pobierania całego albumu
    const handleDownloadAlbum = async () => {
        try {
            setLoading(true);
            const zip = new JSZip();
            const photos = album.photos;

            // Pobierz wszystkie zdjęcia i dodaj do ZIP
            for (let i = 0; i < photos.length; i++) {
                const response = await fetch(photos[i].url, {
                    mode: 'cors',
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    }
                });
                if (!response.ok) throw new Error('Network response was not ok');
                const blob = await response.blob();
                zip.file(`zdjecie_${i + 1}.jpg`, blob);
            }

            // Generuj i pobierz plik ZIP
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${album.name}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href); // Zwolnij pamięć
        } catch (error) {
            console.error('Szczegóły błędu:', error);
            setError('Wystąpił błąd podczas pobierania albumu. Spróbuj ponownie.');
        } finally {
            setLoading(false);
        }
    };

    // Funkcja do pobierania pojedynczego zdjęcia
    const handleDownloadPhoto = async (photo) => {
        try {
            const response = await fetch(photo.url, {
                mode: 'cors',
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            });
            if (!response.ok) throw new Error('Network response was not ok');
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `zdjecie_${photo.id}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href); // Zwolnij pamięć
        } catch (error) {
            console.error('Szczegóły błędu:', error);
            setError('Wystąpił błąd podczas pobierania zdjęcia. Spróbuj ponownie.');
        }
    };

    // Funkcja do pobierania wybranych zdjęć
    const handleDownloadSelected = async () => {
        try {
            setLoading(true);
            const zip = new JSZip();
            const selectedPhotosArray = Array.from(selectedPhotos);

            for (const photoId of selectedPhotosArray) {
                const photo = album.photos.find(p => p.id === photoId);
                if (photo) {
                    const response = await fetch(photo.url, {
                        mode: 'cors',
                        headers: {
                            'Access-Control-Allow-Origin': '*'
                        }
                    });
                    if (!response.ok) throw new Error('Network response was not ok');
                    const blob = await response.blob();
                    zip.file(`zdjecie_${photoId}.jpg`, blob);
                }
            }

            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${album.name}_wybrane.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href); // Zwolnij pamięć
        } catch (error) {
            console.error('Szczegóły błędu:', error);
            setError('Wystąpił błąd podczas pobierania wybranych zdjęć. Spróbuj ponownie.');
        } finally {
            setLoading(false);
            setIsSelectionMode(false);
            setSelectedPhotos(new Set());
        }
    };

    // Funkcja do przełączania wyboru zdjęcia
    const togglePhotoSelection = (photoId) => {
        setSelectedPhotos(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(photoId)) {
                newSelection.delete(photoId);
            } else {
                newSelection.add(photoId);
            }
            return newSelection;
        });
    };

    // Dodaj funkcje obsługujące zakup
    const handlePurchaseSelected = () => {
        setIsFullAlbumPurchase(false);
        setShowPaymentProcess(true);
    };

    const handlePurchaseAlbum = () => {
        setIsFullAlbumPurchase(true);
        setShowPaymentProcess(true);
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
                
                {isDownloadable(album) && (
                    <div className="album-actions">
                        <button 
                            onClick={handleDownloadAlbum}
                            className="download-button"
                            disabled={loading}
                        >
                            Pobierz cały album
                        </button>
                        
                        {!isSelectionMode ? (
                            <button 
                                onClick={() => setIsSelectionMode(true)}
                                className="select-button"
                            >
                                Wybierz zdjęcia
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={handleDownloadSelected}
                                    className="download-selected-button"
                                    disabled={selectedPhotos.size === 0}
                                >
                                    Pobierz wybrane ({selectedPhotos.size})
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsSelectionMode(false);
                                        setSelectedPhotos(new Set());
                                    }}
                                    className="cancel-selection-button"
                                >
                                    ✕
                                </button>
                            </>
                        )}
                    </div>
                )}

                {album?.isCommercial && (
                    <div className="album-actions">
                        <button 
                            onClick={handlePurchaseAlbum}
                            className="purchase-button"
                        >
                            Kup cały album
                        </button>
                        
                        {!isSelectionMode ? (
                            <button 
                                onClick={() => setIsSelectionMode(true)}
                                className="select-button"
                            >
                                Wybierz zdjęcia do zakupu
                            </button>
                        ) : (
                            <>
                                <button 
                                    onClick={handlePurchaseSelected}
                                    className="purchase-selected-button"
                                    disabled={selectedPhotos.size === 0}
                                >
                                    Kup wybrane ({selectedPhotos.size})
                                </button>
                                <button 
                                    onClick={() => {
                                        setIsSelectionMode(false);
                                        setSelectedPhotos(new Set());
                                    }}
                                    className="cancel-selection-button"
                                >
                                    ✕
                                </button>
                            </>
                        )}
                    </div>
                )}
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
                            className={`photo-item ${isSelectionMode ? 'selection-mode' : ''} ${
                                selectedPhotos.has(photo.id) ? 'selected' : ''
                            }`}
                            onClick={() => setSelectedImageIndex(index)}
                        >
                            <img 
                                src={photo.url} 
                                alt={photo.description || `Zdjęcie ${index + 1}`}
                                loading="lazy"
                            />
                            {isSelectionMode && (
                                <button
                                    className="selection-overlay"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Zapobiega otwieraniu podglądu przy kliknięciu w przycisk wyboru
                                        togglePhotoSelection(photo.id);
                                    }}
                                    aria-label={selectedPhotos.has(photo.id) ? 'Odznacz zdjęcie' : 'Zaznacz zdjęcie'}
                                >
                                    {selectedPhotos.has(photo.id) ? '✓' : '+'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-album">
                    <p>Ten album jest pusty</p>
                </div>
            )}

            {selectedImageIndex !== null && (
                <ImageModal
                    imageUrl={album.photos[selectedImageIndex].url}
                    onClose={() => setSelectedImageIndex(null)}
                    onPrev={() => setSelectedImageIndex(prev => 
                        prev > 0 ? prev - 1 : album.photos.length - 1
                    )}
                    onNext={() => setSelectedImageIndex(prev => 
                        prev < album.photos.length - 1 ? prev + 1 : 0
                    )}
                    showDownloadButton={isDownloadable(album)}
                    onDownload={() => handleDownloadPhoto(album.photos[selectedImageIndex])}
                />
            )}

            {error && (
                <Alert 
                    message={error}
                    type="error"
                    onClose={() => setError(null)}
                />
            )}

            {showPaymentProcess && (
                <PaymentProcess
                    selectedPhotos={selectedPhotos}
                    album={album}
                    onClose={() => {
                        setShowPaymentProcess(false);
                        setIsSelectionMode(false);
                        setSelectedPhotos(new Set());
                    }}
                    isFullAlbum={isFullAlbumPurchase}
                />
            )}
        </div>
    );
};

export default AlbumView; 