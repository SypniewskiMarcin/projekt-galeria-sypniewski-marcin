import React, { useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import Comments from './Comments';
import './ImageModal.css';

const ImageModal = ({ imageUrl, onClose, onPrev, onNext, albumId, photoId }) => {
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') onPrev();
            if (e.key === 'ArrowRight') onNext();
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onClose, onPrev, onNext]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>
                <button className="modal-nav modal-prev" onClick={onPrev}>
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>
                <div className="modal-image-container">
                    <img src={imageUrl} alt="Powiększone zdjęcie" className="modal-image" />
                    <div className="modal-comments">
                        <Comments albumId={albumId} photoId={photoId} />
                    </div>
                </div>
                <button className="modal-nav modal-next" onClick={onNext}>
                    <FontAwesomeIcon icon={faChevronRight} />
                </button>
            </div>
        </div>
    );
};

export default ImageModal;
