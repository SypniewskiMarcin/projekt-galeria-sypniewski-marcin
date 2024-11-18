import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import './ImageModal.css';

const ImageModal = ({ imageUrl, onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <FontAwesomeIcon icon={faTimes} />
                </button>
                <img src={imageUrl} alt="Powiększone zdjęcie" />
            </div>
        </div>
    );
};

export default ImageModal;