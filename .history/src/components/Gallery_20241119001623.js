// src/components/Gallery.js
import React, { useState } from "react";
import ImageModal from "./ImageModal";
import "./Gallery.css";

function Gallery() {
    const [selectedImage, setSelectedImage] = useState(null);
    const images = [];
    // Generowanie tablicy obrazków o nazwach 1-29
    for (let i = 1; i <= 29; i++) {
        images.push(
            `/images/2024-11-05_fot_marcin-sypniewski_@pierwiastek-${i}.jpg`
        );
    }

    return (
        <main>
            <div className="gallery">
                {images.map((image, index) => (
                    <div
                        key={index}
                        className="gallery-item"
                        onClick={() => setSelectedImage(image)}
                    >
                        <img src={image} alt={`Zdjęcie ${index + 1}`} />
                    </div>
                ))}
            </div>

            {selectedImage && (
                <ImageModal
                    imageUrl={selectedImage}
                    onClose={() => setSelectedImage(null)}
                />
            )}
        </main>
    );
}

export default Gallery;