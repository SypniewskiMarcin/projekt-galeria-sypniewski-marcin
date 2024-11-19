// src/components/Gallery.js
import React from 'react';

const Gallery = () => {
    return (
        <section className="gallery">
            <h2>Nasza Galeria</h2>
            <div className="gallery-grid">
                <div className="gallery-item">Zdjęcie 1</div>
                <div className="gallery-item">Zdjęcie 2</div>
                <div className="gallery-item">Zdjęcie 3</div>
            </div>
        </section>
    );
};

export default Gallery;
