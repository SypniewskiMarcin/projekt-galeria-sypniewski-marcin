// src/components/Gallery.js
import React, { useState } from "react";
import ImageModal from "./ImageModal";
import "./Gallery.css";

function Gallery() {
    const [selectedImageIndex, setSelectedImageIndex] = useState(null);
    const images = [];
    // Generowanie tablicy obrazków o nazwach 1-29
    for (let i = 1; i <= 29; i++) {
        images.push(
            `/images/2024-11-05_fot_marcin-sypniewski_@pierwiastek-${i}.jpg`
        );
    }

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

    return (
        <main>
            <div className="gallery">
                {images.map((image, index) => (
                    <div
                        key={index}
                        className="gallery-item"
                        onClick={() => setSelectedImageIndex(index)}
                    >
                        <img src={image} alt={`Zdjęcie ${index + 1}`} />
                    </div>
                ))}
            </div>

            {selectedImageIndex !== null && (
                <ImageModal
                    imageUrl={images[selectedImageIndex]}
                    onClose={() => setSelectedImageIndex(null)}
                    onPrev={handlePrev}
                    onNext={handleNext}
                />
            )}
        </main>
    );
}

export default Gallery;
