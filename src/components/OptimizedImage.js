import React, { useState, useEffect, useRef } from 'react';
import { calculateOptimalDimensions, getOptimizedImageUrl, preloadImage } from '../utils/imageUtils';
import './OptimizedImage.css';

const OptimizedImage = ({ 
    src, 
    alt, 
    onClick, 
    className = '', 
    containerWidth = 300,
    priority = false 
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isFullImageLoaded, setIsFullImageLoaded] = useState(false);
    const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const imageRef = useRef(null);
    const observerRef = useRef(null);

    useEffect(() => {
        const calculateDimensions = () => {
            const { width, height } = calculateOptimalDimensions(
                window.innerWidth,
                window.innerHeight,
                containerWidth,
                window.devicePixelRatio
            );
            setDimensions({ width, height });
        };

        calculateDimensions();
        window.addEventListener('resize', calculateDimensions);

        return () => window.removeEventListener('resize', calculateDimensions);
    }, [containerWidth]);

    useEffect(() => {
        if (!priority) {
            observerRef.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        preloadImage(src)
                            .then(() => {
                                setIsFullImageLoaded(true);
                                observerRef.current?.disconnect();
                            })
                            .catch(console.error);
                    }
                },
                { rootMargin: '100px' }
            );

            if (imageRef.current) {
                observerRef.current.observe(imageRef.current);
            }
        } else {
            preloadImage(src)
                .then(() => setIsFullImageLoaded(true))
                .catch(console.error);
        }

        return () => observerRef.current?.disconnect();
    }, [src, priority]);

    const thumbnailSrc = dimensions.width ? 
        getOptimizedImageUrl(src, dimensions.width) : 
        src;

    const handleThumbnailLoad = () => {
        setIsLoaded(true);
        setThumbnailLoaded(true);
    };

    return (
        <div 
            ref={imageRef}
            className={`optimized-image-container ${className}`}
            onClick={onClick}
        >
            <img
                src={thumbnailSrc}
                alt={alt}
                className={`optimized-image thumbnail blur-load ${thumbnailLoaded ? 'loaded' : ''} ${
                    isFullImageLoaded ? 'fade-out' : ''
                }`}
                loading="lazy"
                onLoad={handleThumbnailLoad}
            />
            {isFullImageLoaded && (
                <img
                    src={src}
                    alt={alt}
                    className="optimized-image full-image fade-in"
                    loading="lazy"
                />
            )}
        </div>
    );
};

export default OptimizedImage; 