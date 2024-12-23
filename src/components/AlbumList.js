import React, { useEffect } from 'react';
import OptimizedImage from './OptimizedImage';
import './AlbumList.css';

const AlbumList = ({ albums, onAlbumClick }) => {
    useEffect(() => {
        const handleMouseMove = (e) => {
            const badges = document.querySelectorAll('.album-privacy-badge');
            badges.forEach(badge => {
                const rect = badge.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                badge.style.setProperty('--mouse-x', `${x}%`);
                badge.style.setProperty('--mouse-y', `${y}%`);
            });
        };

        const handleScroll = () => {
            const badges = document.querySelectorAll('.album-privacy-badge');
            badges.forEach(badge => {
                const rect = badge.getBoundingClientRect();
                const scrollProgress = (rect.top / window.innerHeight) * 100;
                badge.style.setProperty('--scroll-y', `${scrollProgress}%`);
            });
        };

        // Obsługa dotyku
        const handleTouch = (e) => {
            const touch = e.touches[0];
            const badges = document.querySelectorAll('.album-privacy-badge');
            badges.forEach(badge => {
                const rect = badge.getBoundingClientRect();
                const x = ((touch.clientX - rect.left) / rect.width) * 100;
                const y = ((touch.clientY - rect.top) / rect.height) * 100;
                badge.style.setProperty('--mouse-x', `${x}%`);
                badge.style.setProperty('--mouse-y', `${y}%`);
                // Dodajemy klasę dla efektu dotykowego
                badge.classList.add('touch-active');
            });
        };

        // Zakończenie dotyku
        const handleTouchEnd = () => {
            const badges = document.querySelectorAll('.album-privacy-badge');
            badges.forEach(badge => {
                // Usuwamy klasę efektu dotykowego
                badge.classList.remove('touch-active');
                // Resetujemy pozycję do środka
                badge.style.setProperty('--mouse-x', '50%');
                badge.style.setProperty('--mouse-y', '50%');
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('touchstart', handleTouch);
        window.addEventListener('touchmove', handleTouch);
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('touchstart', handleTouch);
            window.removeEventListener('touchmove', handleTouch);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, []);

    console.log('AlbumList renderuje się z', albums.length, 'albumami');
    
    return (
        <div className="albums-grid">
            {albums.map(album => {
                console.log('Renderowanie albumu:', {
                    name: album.name,
                    hasCover: !!album.coverPhoto,
                    coverUrl: album.coverPhoto
                });
                return (
                    <div 
                        key={album.id} 
                        className="album-card"
                        onClick={() => onAlbumClick(album.id)}
                        role="button"
                        tabIndex={0}
                    >
                        {album.isPrivate && (
                            <span className="album-privacy-badge">
                                Prywatny
                            </span>
                        )}
                        <div className="album-thumbnail">
                            {album.coverPhoto ? (
                                <img
                                    src={album.coverPhoto}
                                    alt={`Okładka albumu ${album.name}`}
                                    className="album-cover-image"
                                    onError={(e) => {
                                        console.error('Błąd ładowania okładki dla albumu:', album.name);
                                        e.target.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="empty-album-thumbnail">
                                    <span>Pusty</span>
                                </div>
                            )}
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
                );
            })}
        </div>
    );
};

export default AlbumList; 