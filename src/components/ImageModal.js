import React, { useEffect } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import './ImageModal.css';
import OptimizedImage from './OptimizedImage';

const ImageModal = ({ imageUrl, onClose, onPrev, onNext }) => {
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
                <OptimizedImage
                    src={imageUrl}
                    alt="Powiększone zdjęcie"
                    containerWidth={1200}
                    isThumb={false}
                    priority={true}
                />
                <button className="modal-nav modal-next" onClick={onNext}>
                    <FontAwesomeIcon icon={faChevronRight} />
                </button>
            </div>
        </div>
    );
};

export default ImageModal;
