import React, { useState, useEffect } from 'react';
import { db, storage, auth, functions } from '../firebaseConfig';
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs, arrayRemove, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import ImageModal from './ImageModal';
import Alert from './Alert';
import ViewToggle from './ViewToggle';
import './AlbumView.css';
import JSZip from 'jszip';
import PaymentProcess from './PaymentProcess';
import OptimizedImage from './OptimizedImage';
import ImageEditor from './ImageEditor';
import Comments from './Comments';

const AlbumView = ({ albumId, onBack, onStartEditing }) => {
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
    const [viewMode, setViewMode] = useState('square'); // 'square' lub 'natural'
    const [photos, setPhotos] = useState([]);
    const [showImageEditor, setShowImageEditor] = useState(false);
    const [editedPhotos, setEditedPhotos] = useState(new Map()); // Przechowuje edytowane wersje
    const [downloadProgress, setDownloadProgress] = useState(0);

    const checkAndFixAlbumStructure = async (albumData) => {
        if (!albumData.folders?.original || !albumData.folders?.watermarked || !albumData.folders?.watermarkImage) {
            console.log('Naprawiam strukturę folderów albumu:', {
                albumId,
                currentFolders: albumData.folders || {},
                hasWatermark: albumData.watermarkSettings?.enabled
            });
            
            try {
                const updatedFolders = {
                    original: `albums/${albumId}/photo-original`,
                    watermarked: `albums/${albumId}/photo-watermarked`,
                    watermarkImage: `albums/${albumId}/watermark-png`
                };

                await updateDoc(doc(db, 'albums', albumId), {
                    folders: updatedFolders
                });

                console.log('Struktura folderów albumu została naprawiona:', updatedFolders);

                // Pobierz zaktualizowane dane albumu
                const albumRef = doc(db, 'albums', albumId);
                const updatedAlbumDoc = await getDoc(albumRef);
                if (!updatedAlbumDoc.exists()) {
                    throw new Error('Album nie istnieje po aktualizacji');
                }

                const updatedAlbumData = updatedAlbumDoc.data();
                console.log('Zaktualizowane dane albumu:', {
                    folders: updatedAlbumData.folders,
                    watermarkSettings: updatedAlbumData.watermarkSettings
                });

                return updatedAlbumData;
            } catch (error) {
                console.error('Błąd podczas naprawiania struktury folderów:', {
                    error,
                    albumId,
                    currentFolders: albumData.folders || {}
                });
                throw error;
            }
        }
        return albumData;
    };

    useEffect(() => {
        const fetchAlbum = async () => {
            try {
                setLoading(true);
                console.log('Rozpoczynam pobieranie albumu:', albumId);

                const albumRef = doc(db, 'albums', albumId);
                const albumDoc = await getDoc(albumRef);
                
                if (albumDoc.exists()) {
                    let albumData = albumDoc.data();
                    console.log('Pobrano dane albumu:', {
                        hasWatermark: albumData.watermarkSettings?.enabled,
                        folders: albumData.folders,
                        watermarkSettings: albumData.watermarkSettings,
                        author: albumData.author
                    });

                    // Sprawdź czy zalogowany użytkownik jest autorem
                    const currentUser = auth.currentUser;
                    const isUserAuthor = currentUser && albumData.author.uid === currentUser.uid;
                    setIsAuthor(isUserAuthor);
                    
                    console.log('Status autora:', {
                        isAuthor: isUserAuthor,
                        currentUserId: currentUser?.uid,
                        albumAuthorId: albumData.author.uid
                    });

                    // Sprawdź i napraw strukturę folderów
                    albumData = await checkAndFixAlbumStructure(albumData);
                    setAlbum(albumData);
                    
                    // Kontynuuj z pobieraniem zdjęć
                    await fetchPhotos(albumData);
                } else {
                    console.error('Album nie istnieje:', albumId);
                    setError('Album nie istnieje');
                }
            } catch (error) {
                console.error('Błąd podczas pobierania albumu:', {
                    error,
                    albumId,
                    errorMessage: error.message,
                    errorStack: error.stack
                });
                setError('Wystąpił błąd podczas ładowania albumu');
            } finally {
                setLoading(false);
            }
        };

        if (albumId) {
            fetchAlbum();
        }
    }, [albumId]);

    // Dodajemy efekt do monitorowania zmian w auth.currentUser
    useEffect(() => {
        const checkAuthorStatus = () => {
            const currentUser = auth.currentUser;
            if (currentUser && album) {
                const isUserAuthor = album.author.uid === currentUser.uid;
                setIsAuthor(isUserAuthor);
                console.log('Aktualizacja statusu autora:', {
                    isAuthor: isUserAuthor,
                    currentUserId: currentUser.uid,
                    albumAuthorId: album.author.uid
                });
            } else {
                setIsAuthor(false);
                console.log('Brak zalogowanego użytkownika lub danych albumu');
            }
        };

        // Sprawdź status przy zmianie użytkownika lub albumu
        checkAuthorStatus();

        // Nasłuchuj na zmiany w auth
        const unsubscribe = auth.onAuthStateChanged(() => {
            checkAuthorStatus();
        });

        return () => unsubscribe();
    }, [album]);

    const fetchPhotos = async (albumData) => {
        try {
            console.log('Pobieranie zdjęć dla albumu:', {
                albumId,
                hasWatermark: albumData?.watermarkSettings?.enabled,
                folders: albumData?.folders,
                watermarkSettings: albumData?.watermarkSettings
            });

            // Sprawdź czy mamy prawidłową strukturę folderów
            if (!albumData?.folders?.original || !albumData?.folders?.watermarked || !albumData?.folders?.watermarkImage) {
                console.error('Brak wymaganych ścieżek folderów:', {
                    original: albumData?.folders?.original,
                    watermarked: albumData?.folders?.watermarked,
                    watermarkImage: albumData?.folders?.watermarkImage
                });
                throw new Error('Nieprawidłowa struktura folderów albumu');
            }

            // Pobierz zdjęcia z tablicy w dokumencie albumu
            const photos = albumData.photos || [];
            console.log('Znaleziono zdjęć w albumie:', {
                count: photos.length,
                photos: photos
            });
            
            const photoPromises = photos.map(async (photoData) => {
                console.log('Przetwarzanie zdjęcia:', {
                    fileName: photoData.fileName,
                    url: photoData.url
                });

                let photoPath;
                try {
                    // Określ ścieżkę do zdjęcia w zależności od ustawień watermarku
                    if (albumData.watermarkSettings?.enabled) {
                        // Sprawdź czy zdjęcie zostało już przetworzone
                        const processingStatus = albumData.processingStatus?.[photoData.fileName];
                        console.log('Status przetwarzania watermark:', {
                            fileName: photoData.fileName,
                            status: processingStatus?.status,
                            completedAt: processingStatus?.completedAt
                        });

                        // Wyciągnij względną ścieżkę z pełnego URL
                        const urlParts = photoData.url.split('/o/')[1]?.split('?')[0];
                        if (urlParts) {
                            const decodedPath = decodeURIComponent(urlParts);
                            const watermarkedPath = decodedPath.replace('/photo-original/', '/photo-watermarked/');

                            // Najpierw sprawdź czy mamy status w bazie
                            if (processingStatus?.status === 'completed') {
                                photoPath = watermarkedPath;
                                console.log('Używam wersji z watermarkiem (status z bazy):', {
                                    originalPath: decodedPath,
                                    watermarkedPath: photoPath
                                });
                            } else {
                                // Jeśli nie ma statusu, spróbuj sprawdzić czy plik z watermarkiem istnieje
                                try {
                                    const watermarkedRef = ref(storage, watermarkedPath);
                                    await getDownloadURL(watermarkedRef);
                                    // Jeśli nie wystąpił błąd, plik istnieje
                                    photoPath = watermarkedPath;
                                    console.log('Używam wersji z watermarkiem (plik istnieje):', {
                                        originalPath: decodedPath,
                                        watermarkedPath: photoPath
                                    });

                                    // Zaktualizuj status w bazie
                                    const albumRef = doc(db, 'albums', albumId);
                                    const currentAlbumDoc = await getDoc(albumRef);
                                    const currentAlbumData = currentAlbumDoc.data();
                                    const updatedProcessingStatus = {
                                        ...(currentAlbumData.processingStatus || {}),
                                        [photoData.fileName]: {
                                            status: 'completed',
                                            completedAt: new Date().toISOString(),
                                            watermarkedUrl: watermarkedPath
                                        }
                                    };
                                    await updateDoc(albumRef, {
                                        processingStatus: updatedProcessingStatus
                                    });
                                } catch (error) {
                                    // Jeśli plik nie istnieje, użyj oryginału i spróbuj przetworzyć watermark
                                    photoPath = decodedPath;
                                    console.log('Brak wersji z watermarkiem, używam oryginału:', photoPath);

                                    // Sprawdź status przetwarzania w bazie
                                    const currentStatus = albumData.processingStatus?.[photoData.fileName];
                                    console.log('Status przetwarzania watermark:', {
                                        fileName: photoData.fileName,
                                        currentStatus
                                    });

                                    // Jeśli nie ma statusu lub wystąpił błąd, spróbuj przetworzyć ponownie
                                    if (!currentStatus || currentStatus.status === 'error') {
                                        try {
                                            console.log('Rozpoczynam ponowne przetwarzanie watermarku dla:', photoData.fileName);
                                            
                                            // Pobierz token uwierzytelniający
                                            const idToken = await auth.currentUser.getIdToken();
                                            
                                            // Wywołaj funkcję processWatermarkHttp
                                            const response = await fetch('https://europe-central2-projekt-galeria-sypniewski-m.cloudfunctions.net/processWatermarkHttp', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${idToken}`
                                                },
                                                body: JSON.stringify({
                                                    filePath: photoPath,
                                                    albumId: albumId,
                                                    watermarkSettings: albumData.watermarkSettings,
                                                    metadata: {
                                                        authorId: auth.currentUser.uid,
                                                        authorEmail: auth.currentUser.email,
                                                        timestamp: new Date().toISOString(),
                                                        fileName: photoData.fileName,
                                                        retryAttempt: true
                                                    }
                                                })
                                            });

                                            if (!response.ok) {
                                                throw new Error(`HTTP error! status: ${response.status}`);
                                            }

                                            const result = await response.json();
                                            console.log('Ponowne przetwarzanie watermark - wynik:', result);

                                            // Pobierz aktualny stan albumu
                                            const albumRef = doc(db, 'albums', albumId);
                                            const currentAlbumDoc = await getDoc(albumRef);
                                            const currentAlbumData = currentAlbumDoc.data();

                                            // Aktualizuj status w bazie
                                            const updatedProcessingStatus = {
                                                ...(currentAlbumData.processingStatus || {}),
                                                [photoData.fileName]: {
                                                    status: 'processing',
                                                    startedAt: new Date().toISOString(),
                                                    attempt: (currentStatus?.attempt || 0) + 1
                                                }
                                            };

                                            await updateDoc(albumRef, {
                                                processingStatus: updatedProcessingStatus
                                            });

                                            console.log('Status przetwarzania zaktualizowany:', {
                                                fileName: photoData.fileName,
                                                newStatus: updatedProcessingStatus[photoData.fileName]
                                            });
                                        } catch (retryError) {
                                            console.error('Błąd podczas ponownego przetwarzania watermarku:', {
                                                fileName: photoData.fileName,
                                                error: retryError
                                            });
                                        }
                                    } else if (currentStatus.status === 'processing') {
                                        console.log('Watermark jest w trakcie przetwarzania:', {
                                            fileName: photoData.fileName,
                                            startedAt: currentStatus.startedAt,
                                            attempt: currentStatus.attempt
                                        });
                                    }
                                }
                            }
                        } else {
                            photoPath = photoData.url;
                            console.log('Nie udało się przetworzyć ścieżki, używam oryginału:', photoPath);
                        }
                    } else {
                        // Jeśli watermark wyłączony, użyj oryginału
                        photoPath = photoData.url.split('?')[0];
                        console.log('Watermark wyłączony, używam oryginału:', photoPath);
                    }

                    // Użyj Firebase Storage SDK do pobrania URL
                    const imageRef = ref(storage, photoPath);
                    const url = await getDownloadURL(imageRef);
                    console.log('Pobrano URL zdjęcia:', {
                        path: photoPath,
                        url: url
                    });

                    return {
                        ...photoData,
                        url
                    };
                } catch (error) {
                    console.error(`Błąd podczas pobierania zdjęcia ${photoData.fileName}:`, {
                        error,
                        photoPath,
                        originalUrl: photoData.url
                    });
                    // Jeśli nie udało się pobrać wersji z watermarkiem, spróbuj pobrać oryginał
                    if (albumData.watermarkSettings?.enabled && photoPath?.includes('/photo-watermarked/')) {
                        try {
                            const originalPath = photoPath.replace('/photo-watermarked/', '/photo-original/');
                            console.log('Próba pobrania oryginału:', originalPath);
                            const originalRef = ref(storage, originalPath);
                            const originalUrl = await getDownloadURL(originalRef);
                            return {
                                ...photoData,
                                url: originalUrl
                            };
                        } catch (fallbackError) {
                            console.error(`Błąd podczas pobierania oryginału zdjęcia ${photoData.fileName}:`, fallbackError);
                            return null;
                        }
                    }
                    return null;
                }
            });

            const processedPhotos = (await Promise.all(photoPromises)).filter(photo => photo !== null);
            console.log('Pomyślnie pobrano zdjęć:', {
                count: processedPhotos.length,
                photos: processedPhotos.map(p => ({
                    url: p.url,
                    fileName: p.fileName
                }))
            });
            setPhotos(processedPhotos);
        } catch (error) {
            console.error('Szczegóły błędu podczas pobierania zdjęć:', {
                code: error.code,
                message: error.message,
                details: error
            });
            setError('Nie udało się pobrać zdjęć');
        }
    };

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
            const storagePath = `albums/${albumId}/photo-original/${fileName}`;

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

            // Sprawdź czy album ma włączony watermark
            if (album.watermarkSettings?.enabled) {
                console.log('Album ma włączony watermark, rozpoczynam przetwarzanie', {
                    albumId,
                    watermarkSettings: album.watermarkSettings,
                    filePath: storagePath,
                    region: 'europe-central2'
                });
                try {
                    // Pobierz token uwierzytelniający
                    const idToken = await auth.currentUser.getIdToken();
                    
                    // Wywołaj funkcję processWatermarkHttp przez REST API
                    const response = await fetch('https://europe-central2-projekt-galeria-sypniewski-m.cloudfunctions.net/processWatermarkHttp', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                        },
                        body: JSON.stringify({
                            filePath: storagePath,
                            albumId: albumId,
                            watermarkSettings: album.watermarkSettings,
                            metadata: {
                                authorId: auth.currentUser.uid,
                                authorEmail: auth.currentUser.email,
                                timestamp: new Date().toISOString(),
                                fileName: fileName
                            }
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();
                    console.log('Watermark processing result:', result);

                    // Pobierz aktualny stan albumu
                    const currentAlbumDoc = await getDoc(albumRef);
                    const currentAlbumData = currentAlbumDoc.data();
                    
                    // Przygotuj nowy obiekt processingStatus zachowując istniejące statusy
                    const updatedProcessingStatus = {
                        ...(currentAlbumData.processingStatus || {}),
                        [fileName]: {
                            status: 'completed',
                            completedAt: new Date().toISOString(),
                            watermarkedUrl: `albums/${albumId}/photo-watermarked/${fileName}`
                        }
                    };

                    // Aktualizuj status przetwarzania w albumie
                    await updateDoc(albumRef, {
                        processingStatus: updatedProcessingStatus
                    });

                    // Odśwież dane albumu
                    const updatedAlbumDoc = await getDoc(albumRef);
                    const updatedAlbumData = updatedAlbumDoc.data();
                    console.log('Zaktualizowany status przetwarzania:', {
                        fileName,
                        allStatuses: updatedAlbumData?.processingStatus,
                        currentStatus: updatedAlbumData?.processingStatus?.[fileName]
                    });
                    setAlbum({ id: updatedAlbumDoc.id, ...updatedAlbumData });
                } catch (error) {
                    console.error('Błąd podczas przetwarzania watermarku:', error);
                    
                    let errorDetails;
                    if (error instanceof Error && error.message.includes('HTTP error')) {
                        const statusMatch = error.message.match(/status: (\d+)/);
                        const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;
                        
                        if (statusCode === 500) {
                            errorDetails = {
                                code: 'server_error',
                                message: 'Internal server error occurred during watermark processing',
                                details: error.message
                            };
                        } else {
                            try {
                                // Pobierz nowy token uwierzytelniający
                                const newIdToken = await auth.currentUser.getIdToken();
                                
                                // Próba pobrania szczegółów błędu z odpowiedzi
                                const response = await fetch('https://europe-central2-projekt-galeria-sypniewski-m.cloudfunctions.net/processWatermarkHttp', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${newIdToken}`
                                    },
                                    body: JSON.stringify({
                                        filePath: storagePath,
                                        albumId: albumId,
                                        watermarkSettings: album.watermarkSettings,
                                        metadata: {
                                            authorId: auth.currentUser.uid,
                                            authorEmail: auth.currentUser.email,
                                            timestamp: new Date().toISOString(),
                                            fileName: fileName
                                        }
                                    })
                                });
                                const errorResponse = await response.json();
                                errorDetails = {
                                    code: errorResponse.code || 'unknown_error',
                                    message: errorResponse.message || error.message,
                                    details: errorResponse.details,
                                    path: errorResponse.path
                                };
                            } catch (e) {
                                errorDetails = {
                                    code: 'unknown_error',
                                    message: error.message,
                                    details: 'Failed to get error details'
                                };
                            }
                        }
                    } else {
                        errorDetails = {
                            code: error && typeof error === 'object' && 'code' in error ? error.code : 'unknown_error',
                            message: error instanceof Error ? error.message : 'Unknown error',
                            details: error && typeof error === 'object' && 'details' in error ? error.details : undefined
                        };
                    }

                    console.error('Szczegóły błędu:', errorDetails);

                    // Zapisz informację o błędzie w albumie
                    await updateDoc(albumRef, {
                        [`processingStatus.${fileName}`]: {
                            status: 'error',
                            error: errorDetails.message,
                            errorCode: errorDetails.code,
                            errorDetails: errorDetails.details,
                            failedAt: new Date().toISOString()
                        }
                    });
                }
            } else {
                console.log('Album nie ma włączonego watermarku');
            }

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
                try {
                    const imageRef = ref(storage, photos[i].url);
                    const url = await getDownloadURL(imageRef);
                    const response = await fetch(url);
                    if (!response.ok) throw new Error('Network response was not ok');
                    const blob = await response.blob();
                    zip.file(`zdjecie_${i + 1}.jpg`, blob);
                } catch (error) {
                    console.error(`Błąd podczas pobierania zdjęcia ${i + 1}:`, error);
                    continue; // Kontynuuj z następnym zdjęciem
                }
            }

            // Generuj i pobierz plik ZIP
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${album.name}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
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
            const imageRef = ref(storage, photo.url);
            const url = await getDownloadURL(imageRef);
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = photo.fileName || 'zdjecie.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error('Błąd podczas pobierania zdjęcia:', error);
            setError('Wystąpił błąd podczas pobierania zdjęcia');
        }
    };

    // Funkcja do pobierania wybranych zdjęć
    const handleDownloadSelected = async () => {
        try {
            setLoading(true);
            const zip = new JSZip();
            const selectedPhotosArray = Array.from(selectedPhotos);
            console.log('Rozpoczynam pobieranie wybranych zdjęć:', selectedPhotosArray);

            for (let i = 0; i < selectedPhotosArray.length; i++) {
                const photoUrl = selectedPhotosArray[i];
                try {
                    const editedPhoto = editedPhotos.get(photoUrl);
                    const photo = album.photos.find(p => p.url === photoUrl);
                    
                    if (!photo) {
                        console.error('Nie znaleziono zdjęcia:', photoUrl);
                        continue;
                    }

                    const fileName = photo.fileName || `zdjecie_${i + 1}.jpg`;
                    console.log(`Przetwarzanie zdjęcia ${i + 1}/${selectedPhotosArray.length}:`, fileName);
                    
                    if (editedPhoto && editedPhoto.editedBlob) {
                        console.log('Używam edytowanej wersji dla:', fileName);
                        zip.file(`edytowane_${fileName}`, editedPhoto.editedBlob);
                    } else {
                        console.log('Pobieram oryginał dla:', fileName);
                        const imageRef = ref(storage, photo.url);
                        const url = await getDownloadURL(imageRef);
                        const response = await fetch(url);
                        if (!response.ok) throw new Error('Network response was not ok');
                        const blob = await response.blob();
                        zip.file(fileName, blob);
                    }
                } catch (error) {
                    console.error(`Błąd podczas pobierania zdjęcia ${i + 1}:`, error);
                    setError(`Błąd podczas pobierania zdjęcia ${i + 1}`);
                    // Kontynuuj z następnym zdjęciem zamiast przerywać cały proces
                    continue;
                }
            }

            console.log('Generowanie archiwum ZIP...');
            const content = await zip.generateAsync({ 
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: {
                    level: 6
                }
            });

            console.log('Pobieranie archiwum...');
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${album.name}_wybrane_${selectedPhotosArray.length}_zdjec.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            
            setAlertMessage(`Pomyślnie pobrano ${selectedPhotosArray.length} zdjęć`);
        } catch (error) {
            console.error('Błąd podczas pobierania wybranych zdjęć:', error);
            setError('Wystąpił błąd podczas pobierania wybranych zdjęć');
        } finally {
            setLoading(false);
            setIsSelectionMode(false);
            setSelectedPhotos(new Set());
        }
    };

    // Funkcja do przełączania wyboru zdjęcia
    const togglePhotoSelection = (photo) => {
        setSelectedPhotos(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(photo.url)) {
                newSelection.delete(photo.url);
            } else {
                newSelection.add(photo.url);
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

    const loadImage = async (path) => {
        try {
            const imageRef = ref(storage, path);
            const url = await getDownloadURL(imageRef);
            return url;
        } catch (error) {
            console.error('Błąd podczas ładowania zdjęcia:', error);
            return null;
        }
    };

    // Dodajemy funkcję do obsługi edycji
    const handleStartEditing = () => {
        if (selectedPhotos.size === 0) return;
        setShowImageEditor(true);
    };

    // Dodaj funkcję zapisywania edytowanych zdjęć
    const handleSaveEdited = (index, editedImage) => {
        console.log(`Zapisywanie edytowanego zdjęcia ${index + 1}:`, editedImage);
        setEditedPhotos(prev => {
            const newMap = new Map(prev);
            newMap.set(editedImage.url, editedImage);
            return newMap;
        });
        setAlertMessage(`Zdjęcie ${index + 1} zostało zapisane!`);
    };

    const handleDeleteSelected = async () => {
        if (!isAuthor || selectedPhotos.size === 0) return;
        
        if (window.confirm(`Czy na pewno chcesz usunąć ${selectedPhotos.size} wybranych zdjęć?`)) {
            try {
                setLoading(true);
                const selectedPhotosArray = Array.from(selectedPhotos);
                
                // Usuwanie zdjęć z Storage i Firestore
                for (const photoUrl of selectedPhotosArray) {
                    const photo = album.photos.find(p => p.url === photoUrl);
                    if (photo) {
                        // Usuwanie z Storage
                        const storageRef = ref(storage, photo.url);
                        await deleteObject(storageRef);
                        
                        // Usuwanie z Firestore
                        const albumRef = doc(db, 'albums', albumId);
                        await updateDoc(albumRef, {
                            photos: arrayRemove(photo)
                        });
                    }
                }

                setAlertMessage(`Pomyślnie usunięto ${selectedPhotos.size} zdjęć`);
                setSelectedPhotos(new Set());
                setIsSelectionMode(false);
                
                // Odświeżenie danych albumu
                const albumDoc = await getDoc(doc(db, 'albums', albumId));
                if (albumDoc.exists()) {
                    setAlbum({ id: albumDoc.id, ...albumDoc.data() });
                }
            } catch (error) {
                console.error('Błąd podczas usuwania zdjęć:', error);
                setError('Wystąpił błąd podczas usuwania zdjęć');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDeleteAlbum = async () => {
        if (!isAuthor) return;
        
        if (window.confirm('Czy na pewno chcesz usunąć cały album? Tej operacji nie można cofnąć.')) {
            try {
                setLoading(true);
                
                // Usuwanie wszystkich zdjęć z Storage
                for (const photo of album.photos) {
                    const storageRef = ref(storage, photo.url);
                    await deleteObject(storageRef);
                }
                
                // Usuwanie dokumentu albumu z Firestore
                await deleteDoc(doc(db, 'albums', albumId));
                
                setAlertMessage('Album został pomyślnie usunięty');
                onBack(); // Powrót do galerii
            } catch (error) {
                console.error('Błąd podczas usuwania albumu:', error);
                setError('Wystąpił błąd podczas usuwania albumu');
            } finally {
                setLoading(false);
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
                                {isSelectionMode && selectedPhotos.size > 0 && (
                                    <button
                                        className="edit-selected-button"
                                        onClick={handleStartEditing}
                                    >
                                        Edytuj wybrane ({selectedPhotos.size})
                                    </button>
                                )}
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
                                    ✕✕
                                </button>
                            </>
                        )}
                    </div>
                )}
                <ViewToggle 
                    currentView={viewMode} 
                    onViewChange={setViewMode}
                />
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
                <div className={`album-photos ${viewMode}-view`}>
                    {album.photos.map((photo, index) => (
                        <div 
                            key={photo.id} 
                            className={`photo-item ${isSelectionMode ? 'selection-mode' : ''} ${
                                selectedPhotos.has(photo.url) ? 'selected' : ''
                            }`}
                            onClick={() => {
                                if (isSelectionMode) {
                                    togglePhotoSelection(photo);
                                } else {
                                    setSelectedImageIndex(index);
                                }
                            }}
                        >
                            <OptimizedImage
                                src={photo.url}
                                alt={`Zdjęcie ${index + 1}`}
                                containerWidth={viewMode === 'square' ? 250 : undefined}
                                naturalAspectRatio={viewMode === 'natural'}
                                priority={index < 4}
                                albumData={album}
                            />
                            {isSelectionMode && (
                                <button
                                    className="selection-overlay"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePhotoSelection(photo);
                                    }}
                                    aria-label={selectedPhotos.has(photo.url) ? 'Odznacz zdjęcie' : 'Zaznacz zdjęcie'}
                                >
                                    {selectedPhotos.has(photo.url) ? '✓' : '+'}
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

            {selectedImageIndex !== null && album?.photos?.length > 0 && (
                <ImageModal
                    imageUrl={album.photos[selectedImageIndex].url}
                    onClose={() => setSelectedImageIndex(null)}
                    onPrev={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : album.photos.length - 1))}
                    onNext={() => setSelectedImageIndex((prev) => (prev < album.photos.length - 1 ? prev + 1 : 0))}
                    albumId={albumId}
                    photoId={album.photos[selectedImageIndex].id}
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

            {showImageEditor && (
                <ImageEditor
                    images={Array.from(selectedPhotos).map(url => ({
                        url,
                        edited: editedPhotos.get(url)
                    }))}
                    isOpen={showImageEditor}
                    onClose={() => setShowImageEditor(false)}
                    onSave={handleSaveEdited}
                />
            )}

            {downloadProgress > 0 && (
                <div className="download-progress">
                    <div className="progress-bar" style={{ width: `${downloadProgress}%` }} />
                    <span>Pobieranie: {Math.round(downloadProgress)}%</span>
                </div>
            )}

            {/* Sekcja komentarzy do albumu */}
            <div className="album-comments mt-8">
                <Comments albumId={albumId} />
            </div>

            {isAuthor && (
                <div className="album-actions">
                    {!isSelectionMode ? (
                        <>
                            <button 
                                onClick={() => setIsSelectionMode(true)}
                                className="select-button"
                            >
                                Wybierz zdjęcia do usunięcia
                            </button>
                            <button 
                                onClick={handleDeleteAlbum}
                                className="delete-album-button"
                            >
                                Usuń cały album
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={handleDeleteSelected}
                                className="delete-selected-button"
                                disabled={selectedPhotos.size === 0}
                            >
                                Usuń wybrane ({selectedPhotos.size})
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
    );
};

export default AlbumView; 