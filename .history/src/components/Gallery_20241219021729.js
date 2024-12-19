// src/components/Gallery.js
import React, { useState, useEffect, useCallback } from "react";
import ImageModal from "./ImageModal";
import Alert from "./Alert"; // Importuj komponent Alert
import { storage, auth } from '../firebaseConfig'; // Importuj storage i auth
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import "./Gallery.css";
import CreateAlbum from './CreateAlbum'; // Importuj komponent do tworzenia albumów
import { db } from '../firebaseConfig';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

function Gallery({ user }) {
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [images, setImages] = useState([]);
    const [uploadError, setUploadError] = useState('');
    const [selectedFile, setSelectedFile] = useState(null); // Stan do przechowywania wybranego pliku
    const [alertMessage, setAlertMessage] = useState(''); // Stan do przechowywania komunikatu alertu
    const [isCreateAlbumVisible, setIsCreateAlbumVisible] = useState(false); // Stan do zarządzania widocznością formularza
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('createdAt'); // domyślne sortowanie po dacie utworzenia
    const [sortDirection, setSortDirection] = useState('desc'); // domyślnie malejąco
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [albumsPerPage] = useState(10);

    const categories = [
        'all',
        'sportowa',
        'krajobrazowa',
        'eventowa',
        'reportażowa',
        'nocna',
        'uliczna',
        'portretowa',
        'produktowa',
        'kulinarna'
    ];

    // Generowanie tablicy obrazków o nazwach 1-29
    useEffect(() => {
        const imageArray = [];
        for (let i = 1; i <= 29; i++) {
            imageArray.push(
                `https://raw.githubusercontent.com/SypniewskiMarcin/projekt-galeria-sypniewski-marcin/refs/heads/main/public/images/2024-11-05_fot_marcin-sypniewski_@pierwiastek-${i}.jpg`)
        }
        setImages(imageArray);
    }, []);

    useEffect(() => {
        fetchAlbums();
    }, [sortBy, sortDirection, selectedCategory, searchTerm]);

    const fetchAlbums = useCallback(async () => {
        try {
            setLoading(true);
            const albumsRef = collection(db, 'albums');
            let q = query(
                albumsRef,
                where('isPublic', '==', true),
                orderBy(sortBy, sortDirection)
            );

            const querySnapshot = await getDocs(q);
            const albumsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filtrowanie po kategorii
            const filteredAlbums = selectedCategory === 'all'
                ? albumsData
                : albumsData.filter(album => album.categories?.includes(selectedCategory));

            // Filtrowanie po wyszukiwanej frazie
            const searchedAlbums = searchTerm
                ? filteredAlbums.filter(album =>
                    album.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    album.author.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    album.location?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                : filteredAlbums;

            setAlbums(searchedAlbums);
        } catch (error) {
            console.error('Błąd podczas pobierania albumów:', error);
        } finally {
            setLoading(false);
        }
    }, [sortBy, sortDirection, selectedCategory, searchTerm]);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleSortChange = (e) => {
        setSortBy(e.target.value);
    };

    const handleDirectionChange = () => {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    const handleCategoryChange = (e) => {
        setSelectedCategory(e.target.value);
    };

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
    const uploadFile = (file) => {
        const userId = auth.currentUser.uid; // Pobierz userId z Firebase Authentication
        const storageRef = ref(storage, `images/${userId}/${file.name}`);

        uploadBytes(storageRef, file).then((snapshot) => {
            console.log('Uploaded a blob or file!', snapshot);
            // Po przesłaniu pliku, możesz od razu pobrać URL
            getFileUrl(file.name); // Wywołaj funkcję do pobierania URL
            setAlertMessage('Plik wysłany pomyślnie!'); // Ustaw komunikat o sukcesie
            setSelectedFile(null); // Wyczyść wybrane plik
            document.getElementById('fileInput').value = ''; // Wyczyść pole input
        }).catch((error) => {
            console.error('Error uploading file:', error);
            setUploadError('Błąd przesyłania pliku. Spróbuj ponownie.'); // Ustaw komunikat o błędzie
        });
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

    const indexOfLastAlbum = currentPage * albumsPerPage;
    const indexOfFirstAlbum = indexOfLastAlbum - albumsPerPage;
    const currentAlbums = albums.slice(indexOfFirstAlbum, indexOfLastAlbum);
    const totalPages = Math.ceil(albums.length / albumsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading) {
        return <div className="loading">Ładowanie albumów...</div>;
    }

    return (
        <main>
            <div className="gallery-header">
                <h2>Galeria</h2>
                <button
                    className="add-album-button"
                    onClick={() => setIsCreateAlbumVisible(true)}
                >
                    <span>+</span>
                </button>
            </div>

            {isCreateAlbumVisible && (
                <div className="create-album-modal">
                    <CreateAlbum user={user} onClose={() => setIsCreateAlbumVisible(false)} />
                </div>
            )}

            <div className="upload-container">
                <input
                    type="file"
                    id="fileInput"
                    onChange={(e) => {
                        const file = e.target.files[0];
                        setSelectedFile(file);
                    }}
                    className="file-input"
                />
                <button
                    onClick={() => {
                        if (selectedFile) {
                            uploadFile(selectedFile);
                        } else {
                            setUploadError('Proszę wybrać plik przed wysłaniem.');
                        }
                    }}
                    className="upload-button"
                >
                    Wyślij
                </button>
                {uploadError && <p className="error-message">{uploadError}</p>}
            </div>

            {alertMessage && <Alert message={alertMessage} onClose={() => setAlertMessage('')} />}

            <div className="gallery-container">
                <div className="gallery-controls">
                    <input
                        type="text"
                        placeholder="Szukaj po nazwie, autorze lub lokalizacji..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="search-input"
                    />

                    <select
                        value={sortBy}
                        onChange={handleSortChange}
                        className="sort-select"
                    >
                        <option value="createdAt">Data publikacji</option>
                        <option value="creationDate">Data wydarzenia</option>
                        <option value="name">Nazwa</option>
                    </select>

                    <button
                        onClick={handleDirectionChange}
                        className="sort-direction-button"
                    >
                        {sortDirection === 'asc' ? '↑' : '↓'}
                    </button>

                    <select
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                        className="category-select"
                    >
                        {categories.map(category => (
                            <option key={category} value={category}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="pagination-controls">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="pagination-button"
                    >
                        ← Poprzednia
                    </button>
                    <span className="pagination-info">
                        Strona {currentPage} z {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="pagination-button"
                    >
                        Następna →
                    </button>
                </div>

                <div className="albums-grid">
                    {currentAlbums.map(album => (
                        <div key={album.id} className="album-card">
                            <div className="album-thumbnail">
                                <img
                                    src="/placeholder-album.jpg"
                                    alt={`Okładka albumu ${album.name}`}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            </div>
                            <div className="album-content">
                                <h3>{album.name}</h3>
                                <p>Autor: {album.author.displayName}</p>
                                {album.location && <p>Lokalizacja: {album.location}</p>}
                                <p>Data publikacji: {new Date(album.createdAt).toLocaleDateString()}</p>
                                {album.creationDate && (
                                    <p>Data wydarzenia: {new Date(album.creationDate).toLocaleDateString()}</p>
                                )}
                                {album.categories && (
                                    <div className="album-categories">
                                        {album.categories.map(category => (
                                            <span key={category} className="category-tag">
                                                {category}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pagination-controls">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="pagination-button"
                    >
                        ← Poprzednia
                    </button>
                    <span className="pagination-info">
                        Strona {currentPage} z {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="pagination-button"
                    >
                        Następna →
                    </button>
                </div>
            </div>

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
