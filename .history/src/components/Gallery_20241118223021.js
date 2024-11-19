// src/components/Gallery.js
import React, { useState } from 'react';
import ImageModal from './ImageModal';

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
                            imageUrl={selectedImage}
                            onClose={() => setSelectedImage(null)}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}

export default Gallery;



// // src/components/Gallery.js
// import React from 'react';

// const Gallery = () => {
//     return (
//         <section className="gallery">
//             <h2>Nasza Galeria</h2>
//             <div className="gallery-grid">
//                 <div className="gallery-item">Zdjęcie 1</div>
//                 <div className="gallery-item">Zdjęcie 2</div>
//                 <div className="gallery-item">Zdjęcie 3</div>
//             </div>
//         </section>
//     );
// };

// export default Gallery;
