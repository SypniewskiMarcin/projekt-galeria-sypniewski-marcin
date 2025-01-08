import React, { useState, useEffect, useRef } from 'react';
import { calculateOptimalDimensions, getOptimizedImageUrl, preloadImage } from '../utils/imageUtils';
import { storage } from '../firebaseConfig';
import { ref, getDownloadURL } from 'firebase/storage';
import './OptimizedImage.css';

const OptimizedImage = ({ 
    src, 
    alt, 
    onClick, 
    className = '', 
    containerWidth,
    naturalAspectRatio = false,
    priority = false,
    isThumb = true,
    albumData = null
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isFullImageLoaded, setIsFullImageLoaded] = useState(false);
    const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [finalImageUrl, setFinalImageUrl] = useState(src);
    const imageRef = useRef(null);
    const observerRef = useRef(null);

    useEffect(() => {
        const checkAndLoadWatermarkedImage = async () => {
            if (!albumData?.watermarkSettings?.enabled) {
                setFinalImageUrl(src);
                return;
            }

            try {
                const urlParts = src.split('/o/')[1]?.split('?')[0];
                if (!urlParts) {
                    console.log('Nie udało się przetworzyć ścieżki, używam oryginału:', src);
                    setFinalImageUrl(src);
                    return;
                }

                const decodedPath = decodeURIComponent(urlParts);
                const watermarkedPath = decodedPath.replace('/photo-original/', '/photo-watermarked/');

                try {
                    const watermarkedRef = ref(storage, watermarkedPath);
                    const watermarkedUrl = await getDownloadURL(watermarkedRef);
                    console.log('Używam wersji z watermarkiem:', {
                        originalPath: decodedPath,
                        watermarkedPath: watermarkedPath
                    });
                    setFinalImageUrl(watermarkedUrl);
                } catch (error) {
                    console.log('Brak wersji z watermarkiem, używam oryginału:', src);
                    setFinalImageUrl(src);
                }
            } catch (error) {
                console.error('Błąd podczas sprawdzania watermarku:', error);
                setFinalImageUrl(src);
            }
        };

        checkAndLoadWatermarkedImage();
    }, [src, albumData]);

    useEffect(() => {
        const calculateDimensions = () => {
            const img = new Image();
            img.src = finalImageUrl;
            img.onload = () => {
                const aspectRatio = img.height / img.width;
                const originalWidth = img.width * 0.4;
                const originalHeight = img.height * 0.4;

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
    }, [finalImageUrl]);

    const thumbnailSrc = dimensions.width ? 
        getOptimizedImageUrl(finalImageUrl, dimensions.width, isThumb, naturalAspectRatio) : 
        finalImageUrl;

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
                crossOrigin="anonymous"
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
                    src={finalImageUrl}
                    alt={alt}
                    className="optimized-image full-image fade-in"
                    loading="lazy"
                />
            )}
        </div>
    );
};

export default OptimizedImage; 