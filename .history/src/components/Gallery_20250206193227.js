// src/components/Gallery.js
import React, { useState, useEffect, useCallback, useRef } from "react";
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
import BusinessCard from './BusinessCard';

function Gallery({ user, onStartEditing }) {
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
    const [selectedImages, setSelectedImages] = useState([]);
    const formRef = useRef(null);
    const containerRef = useRef(null);
    const [isBusinessCardVisible, setIsBusinessCardVisible] = useState(false);

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

    const fetchImage = async (path) => {
        try {
            const imageRef = ref(storage, path);
            const url = await getDownloadURL(imageRef);
            return url;
        } catch (error) {
            console.error('Błąd podczas ładowania obrazu:', error);
            throw error;
        }
    };

    const handleAlbumCreated = () => {
        fetchAlbums(); // Odświeżamy listę albumów
        setIsCreateAlbumVisible(false); // Zamykamy formularz
    };

    useEffect(() => {
        if (!formRef.current || !containerRef.current) return;

        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const height = entry.borderBoxSize[0].blockSize;
                // Dodajemy 40px marginesu dla lepszego wyglądu
                containerRef.current.style.paddingTop = `${height + 40}px`;
            }
        });

        if (isCreateAlbumVisible && formRef.current) {
            resizeObserver.observe(formRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [isCreateAlbumVisible]);

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
                        <button
                            className={`add-album-button ${isCreateAlbumVisible ? 'form-open' : ''}`}
                            onClick={() => setIsCreateAlbumVisible(!isCreateAlbumVisible)}
                        >
                            <span className="button-content">
                                <svg
                                    className="add-album-icon"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                                    <line x1="12" y1="10" x2="12" y2="16" />
                                    <line x1="9" y1="13" x2="15" y2="13" />
                                </svg>
                                <span className="button-text">Utwórz nowy album</span>
                                <div className="button-shine"></div>
                            </span>
                        </button>

                        <button
                            className="business-card-button"
                            onClick={() => setIsBusinessCardVisible(!isBusinessCardVisible)}
                        >
                            <span className="button-content">
                                <svg
                                    className="business-card-icon"
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                    <line x1="2" y1="10" x2="22" y2="10" />
                                </svg>
                                <span className="button-text">Szukasz fotografa?</span>
                                <div className="button-shine"></div>
                            </span>
                        </button>
                    </div>

                    <div
                        ref={containerRef}
                        className={`gallery-container ${isCreateAlbumVisible || isBusinessCardVisible ? 'form-open' : ''}`}
                    >
                        {isCreateAlbumVisible && (
                            <CreateAlbum
                                ref={formRef}
                                user={user}
                                onClose={() => setIsCreateAlbumVisible(false)}
                                onAlbumCreated={handleAlbumCreated}
                            />
                        )}

                        {isBusinessCardVisible && (
                            <BusinessCard
                                ref={formRef}
                                onClose={() => setIsBusinessCardVisible(false)}
                            />
                        )}

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
                                <option value="">Wszystkie kategorie</option>
                                {categories.map(category => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <AlbumList albums={currentAlbums} onAlbumClick={handleAlbumClick} />

                        {albums.length > albumsPerPage && (
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
                        )}
                    </div>
                </>
            )}
        </main>
    );
}

export default Gallery;
