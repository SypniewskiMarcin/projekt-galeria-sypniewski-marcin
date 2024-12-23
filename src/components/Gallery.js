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
import AlbumView from './AlbumView'; // Importuj komponent AlbumView
import OptimizedImage from './OptimizedImage';
import AlbumList from './AlbumList';

function Gallery({ user }) {
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const [images, setImages] = useState([]);
    const [isCreateAlbumVisible, setIsCreateAlbumVisible] = useState(false); // Stan do zarządzania widocznością formularza
    const [albums, setAlbums] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('createdAt'); // domyślne sortowanie po dacie utworzenia
    const [sortDirection, setSortDirection] = useState('desc'); // domyślnie malejąco
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [albumsPerPage] = useState(10);
    const [selectedAlbumId, setSelectedAlbumId] = useState(null);
    const [error, setError] = useState(null);

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
    }, [sortBy, sortDirection, selectedCategory, searchTerm, user]);

    const fetchAlbums = useCallback(async () => {
        try {
            setLoading(true);
            const albumsRef = collection(db, 'albums');

            // Podstawowe zapytanie o publiczne albumy
            const publicQuery = query(
                albumsRef,
                where('isPublic', '==', true)
            );
            const publicSnapshot = await getDocs(publicQuery);
            let allAlbums = publicSnapshot.docs.map(doc => {
                const albumData = doc.data();
                console.log('Przetwarzanie albumu:', albumData.name);
                
                // Sprawdź czy album ma zdjęcia i ustaw okładkę
                const coverPhoto = albumData.photos && albumData.photos.length > 0 
                    ? albumData.photos[0].url 
                    : null;

                if (coverPhoto) {
                    console.log('Album', albumData.name, 'ma okładkę:', coverPhoto);
                }

                return {
                    id: doc.id,
                    ...albumData,
                    coverPhoto,
                    isPrivate: false
                };
            });

            // Jeśli użytkownik jest zalogowany, dodaj jego prywatne albumy
            if (user) {
                const privateQuery = query(
                    albumsRef,
                    where('isPublic', '==', false),
                    where('author.uid', '==', user.uid)
                );
                const privateSnapshot = await getDocs(privateQuery);
                const privateAlbums = privateSnapshot.docs.map(doc => {
                    const albumData = doc.data();
                    const coverPhoto = albumData.photos && albumData.photos.length > 0 
                        ? albumData.photos[0].url 
                        : null;
                    
                    return {
                        id: doc.id,
                        ...albumData,
                        coverPhoto,
                        isPrivate: true
                    };
                });
                allAlbums = [...allAlbums, ...privateAlbums];
            }

            // Sortowanie
            allAlbums.sort((a, b) => {
                if (sortDirection === 'asc') {
                    return a[sortBy] > b[sortBy] ? 1 : -1;
                }
                return a[sortBy] < b[sortBy] ? 1 : -1;
            });

            // Filtrowanie
            if (selectedCategory !== 'all') {
                allAlbums = allAlbums.filter(album => 
                    album.categories?.includes(selectedCategory)
                );
            }

            // Wyszukiwanie
            if (searchTerm) {
                allAlbums = allAlbums.filter(album =>
                    album.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    album.author.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    album.location?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            setAlbums(allAlbums);
        } catch (error) {
            console.error('Błąd podczas pobierania albumów:', error);
            setError('Wystąpił błąd podczas pobierania albumów');
        } finally {
            setLoading(false);
        }
    }, [sortBy, sortDirection, selectedCategory, searchTerm, user]);

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

    const indexOfLastAlbum = currentPage * albumsPerPage;
    const indexOfFirstAlbum = indexOfLastAlbum - albumsPerPage;
    const currentAlbums = albums.slice(indexOfFirstAlbum, indexOfLastAlbum);
    console.log('Przekazywanie do AlbumList albumów:', {
        total: albums.length,
        currentPage,
        albumsPerPage,
        currentAlbums: currentAlbums.map(album => ({
            id: album.id,
            name: album.name,
            hasCover: !!album.coverPhoto
        }))
    });
    const totalPages = Math.ceil(albums.length / albumsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAlbumClick = (albumId) => {
        setSelectedAlbumId(albumId);
    };

    if (loading) {
        return <div className="loading">Ładowanie albumów...</div>;
    }

    return (
        <main>
            {selectedAlbumId ? (
                <AlbumView 
                    albumId={selectedAlbumId} 
                    onBack={() => setSelectedAlbumId(null)}
                />
            ) : (
                <>
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

                    <div className="gallery-container">
                        <div className="gallery-controls">
                            <input
                                type="text"
                                placeholder="Szukaj po nazwie, autorze lub lokalizacji..."
                                value={searchTerm}
                                onChange={handleSearch}
                                className="search-input"
                            />

                            <div className="sort-controls">
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
                                    aria-label={sortDirection === 'asc' ? 'Sortuj rosnąco' : 'Sortuj malejąco'}
                                >
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                </button>
                            </div>

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
                            <AlbumList 
                                albums={currentAlbums} 
                                onAlbumClick={handleAlbumClick} 
                            />
                        </div>
                    </div>

                    <div className="gallery">
                        {images.map((image, index) => (
                            <div key={index} className="gallery-item">
                                <OptimizedImage
                                    src={image}
                                    alt={`Zdjęcie ${index + 1}`}
                                    containerWidth={400}
                                    priority={index < 2} // Pierwsze dwa zdjęcia ładowane priorytetowo
                                />
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
                </>
            )}
        </main>
    );
}

export default Gallery;
