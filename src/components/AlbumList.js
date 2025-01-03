import React, { useEffect } from 'react';
import OptimizedImage from './OptimizedImage';
import './AlbumList.css';

const AlbumList = ({ albums, onAlbumClick }) => {
    useEffect(() => {
        let lastScrollY = window.scrollY;
        let lastScrollTime = Date.now();
        let scrollVelocity = 0;
        let previousVelocity = 0;
        let scrollTimeout;

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
            const currentTime = Date.now();
            const timeDiff = currentTime - lastScrollTime;
            const scrollDiff = Math.abs(window.scrollY - lastScrollY);
            
            // Płynniejsze obliczanie prędkości
            scrollVelocity = Math.min(
                scrollDiff / Math.max(timeDiff, 16), // Limit do 60fps
                1.0
            );
            
            // Dodajemy wygładzanie
            scrollVelocity = scrollVelocity * 0.7 + previousVelocity * 0.3;
            
            const badges = document.querySelectorAll('.album-privacy-badge');
            badges.forEach(badge => {
                const rect = badge.getBoundingClientRect();
                const scrollProgress = (rect.top / window.innerHeight) * 100;
                
                // Płynniejsze mapowanie intensywności
                const intensity = Math.min(
                    Math.max(scrollVelocity * 12, 0.1),
                    1.0
                );
                
                requestAnimationFrame(() => {
                    badge.style.setProperty('--scroll-velocity', intensity);
                    badge.style.setProperty('--scroll-y', `${scrollProgress}%`);
                    
                    if (scrollVelocity > 0.05) { // Niższy próg aktywacji
                        badge.classList.add('scroll-active');
                    } else {
                        badge.classList.remove('scroll-active');
                    }
                });
            });

            previousVelocity = scrollVelocity;
            lastScrollY = window.scrollY;
            lastScrollTime = currentTime;
            
            // Płynniejsze wygaszanie
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const fadeOut = () => {
                    scrollVelocity *= 0.85;
                    if (scrollVelocity > 0.01) {
                        badges.forEach(badge => {
                            badge.style.setProperty('--scroll-velocity', scrollVelocity);
                        });
                        requestAnimationFrame(fadeOut);
                    } else {
                        scrollVelocity = 0;
                        badges.forEach(badge => {
                            badge.classList.remove('scroll-active');
                            badge.style.setProperty('--scroll-velocity', '0');
                        });
                    }
                };
                requestAnimationFrame(fadeOut);
            }, 50);
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
        window.addEventListener('scroll', handleScroll, { passive: true });
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