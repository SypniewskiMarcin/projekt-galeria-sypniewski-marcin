import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import ImageModal from './ImageModal';
import './AlbumView.css';

const AlbumView = ({ albumId, onBack }) => {
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);

    useEffect(() => {
        const fetchAlbum = async () => {
            try {
                setLoading(true);
                const albumRef = doc(db, 'albums', albumId);
                const albumDoc = await getDoc(albumRef);
                
                if (albumDoc.exists()) {
                    setAlbum({ id: albumDoc.id, ...albumDoc.data() });
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