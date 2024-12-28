import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import OptimizedImage from './OptimizedImage';
import './AlbumGalleryView.css';

const AlbumGalleryView = () => {
    const { albumId } = useParams();
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAlbum = async () => {
            try {
                const albumDoc = await getDoc(doc(db, 'albums', albumId));
                if (albumDoc.exists()) {
                    setAlbum({ id: albumDoc.id, ...albumDoc.data() });
                } else {
                    setError('Album nie został znaleziony');
                }
            } catch (err) {
                setError('Wystąpił błąd podczas ładowania albumu');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAlbum();
    }, [albumId]);

    if (loading) return <div className="loading">Ładowanie...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!album) return <div className="error">Album nie istnieje</div>;

    return (
        <div className="album-gallery-view">
            <header className="gallery-header">
                <Link to="/" className="back-link">
                    ← Powrót do galerii
                </Link>
                <h1>{album.name}</h1>
                <div className="album-meta">
                    <p>Autor: {album.author.displayName}</p>
                    {album.location && <p>Lokalizacja: {album.location}</p>}
                    <p>Data utworzenia: {new Date(album.createdAt).toLocaleDateString()}</p>
                </div>
            </header>

            <div className="photos-grid">
                {album.photos?.map((photo, index) => (
                    <div key={photo.id} className="photo-tile">
                        <OptimizedImage
                            src={photo.url}
                            alt={`Zdjęcie ${index + 1}`}
                            naturalAspectRatio={true}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AlbumGalleryView; 