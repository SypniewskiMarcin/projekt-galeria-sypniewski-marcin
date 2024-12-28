import React, { useRef, useEffect, useState } from 'react';

const LazyGallery = ({ photos }) => {
    const [visiblePhotos, setVisiblePhotos] = useState([]);
    const containerRef = useRef(null);

    useEffect(() => {
        const options = {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const photoId = entry.target.dataset.photoId;
                    setVisiblePhotos(prev => [...prev, photoId]);
                }
            });
        }, options);

        const elements = containerRef.current.querySelectorAll('.photo-placeholder');
        elements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <div ref={containerRef} className="gallery-container">
            {photos.map(photo => (
                <div 
                    key={photo.id}
                    className="photo-placeholder"
                    data-photo-id={photo.id}
                >
                    {visiblePhotos.includes(photo.id) ? (
                        <OptimizedImage
                            src={photo.url}
                            alt={photo.title}
                            naturalAspectRatio
                        />
                    ) : (
                        <div className="photo-skeleton" />
                    )}
                </div>
            ))}
        </div>
    );
}; 