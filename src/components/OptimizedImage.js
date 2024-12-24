import React, { useState, useEffect, useRef } from 'react';
import { calculateOptimalDimensions, getOptimizedImageUrl, preloadImage } from '../utils/imageUtils';
import './OptimizedImage.css';

const OptimizedImage = ({ 
    src, 
    alt, 
    onClick, 
    className = '', 
    containerWidth,
    naturalAspectRatio = false,
    priority = false,
    isThumb = true
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isFullImageLoaded, setIsFullImageLoaded] = useState(false);
    const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const imageRef = useRef(null);
    const observerRef = useRef(null);

    useEffect(() => {
        const calculateDimensions = () => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                const aspectRatio = img.height / img.width;
                const originalWidth = img.width * 0.4; // Kompresja do 40% oryginalnej szerokości
                const originalHeight = img.height * 0.4; // Kompresja do 40% oryginalnej wysokości

                setDimensions({
                    width: originalWidth,
                    height: originalHeight,
                    aspectRatio: aspectRatio
                });
            };
        };

        calculateDimensions();
        window.addEventListener('resize', calculateDimensions);

        return () => window.removeEventListener('resize', calculateDimensions);
    }, [src]);

    const thumbnailSrc = dimensions.width ? 
        getOptimizedImageUrl(src, dimensions.width, isThumb, naturalAspectRatio) : 
        src;

    return (
        <div 
            ref={imageRef}
            className={`optimized-image-container ${className} ${
                naturalAspectRatio ? 'natural-ratio' : ''
            }`}
            onClick={onClick}
            style={naturalAspectRatio ? {
                height: '100%',
                width: '100%'
            } : undefined}
        >
            <img
                src={thumbnailSrc}
                alt={alt}
                className={`optimized-image thumbnail blur-load ${thumbnailLoaded ? 'loaded' : ''} ${
                    isFullImageLoaded ? 'fade-out' : ''
                }`}
                loading="lazy"
                onLoad={() => setThumbnailLoaded(true)}
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