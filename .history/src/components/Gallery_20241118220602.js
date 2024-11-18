// src/components/Gallery.js
import React, { useState } from 'react';
import ImageModal from './ImageModal';
import './Gallery.css';

function Gallery({ images }) {
    const [selectedImage, setSelectedImage] = useState(null);

    return (
        <div className="gallery-grid">
            {images.map((image, index) => (
                <div
                    key={index}
                    className="gallery-item"
                    onClick={() => setSelectedImage(image)}
                >
                    <img src={image} alt={`Zdjęcie ${index + 1}`} />
                </div>
            ))}

            {selectedImage && (
                <ImageModal
                    image={selectedImage}
                    onClose={() => setSelectedImage(null)}
                />
            )}
        </div>
    );
}

export default Gallery;
