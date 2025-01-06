import React, { useEffect } from 'react';
import Comments from './Comments';
import './ImageModal.css';

const ImageModal = ({ imageUrl, onClose, onPrev, onNext, albumId, photoId }) => {
    useEffect(() => {
        const handleKeyPress = (e) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    onPrev();
                    break;
                case 'ArrowRight':
                    onNext();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onClose, onPrev, onNext]);

    const handleBackgroundClick = (e) => {
        // Sprawdzamy, czy kliknięcie było w chronione elementy
        let currentElement = e.target;
        while (currentElement && currentElement.className) {
            // Chronione elementy: sekcja komentarzy i przyciski nawigacji
            if (currentElement.className.includes('comments-section') || 
                currentElement.className.includes('nav-button') ||
                currentElement.className.includes('close-button')) {
                return; // Nie zamykamy modalu dla chronionych elementów
            }
            currentElement = currentElement.parentElement;
        }

        // Dla wszystkich innych elementów zamykamy modal
        onClose();
    };

    return (
        <div className="image-modal" onClick={handleBackgroundClick}>
            <div className="modal-content">
                <div className="image-container">
                    <img src={imageUrl} alt="Pełny widok zdjęcia" className="modal-image" />
                </div>
                
                <div className="comments-section">
                    <Comments albumId={albumId} photoId={photoId} />
                </div>
            </div>

            <button className="close-button" onClick={onClose} aria-label="Zamknij">
                ✕
            </button>
            
            <button className="nav-button prev-button" onClick={onPrev} aria-label="Poprzednie zdjęcie">
                ‹
            </button>
            
            <button className="nav-button next-button" onClick={onNext} aria-label="Następne zdjęcie">
                ›
            </button>
        </div>
    );
};

export default ImageModal;
