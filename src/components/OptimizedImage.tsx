import React, { useState } from 'react';
import './OptimizedImage.css';

interface OptimizedImageProps {
  src: string;
  alt: string;
  onClick?: () => void;
  containerWidth: number;
  priority?: boolean;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  onClick,
  containerWidth,
  priority = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
    console.error(`Failed to load image: ${src}`);
  };

  const handleClick = () => {
    if (onClick && !error) {
      onClick();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div 
      className={`
        optimized-image-container
        ${isLoaded ? 'loaded' : 'loading'}
        ${error ? 'error' : ''}
        ${onClick ? 'clickable' : ''}
      `}
      style={{ width: containerWidth }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : -1}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `Otwórz ${alt}` : undefined}
    >
      {!error ? (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
          className={isLoaded ? 'visible' : 'hidden'}
        />
      ) : (
        <div className="error-placeholder">
          <span>Nie udało się załadować zdjęcia</span>
        </div>
      )}
      {!isLoaded && !error && (
        <div className="loading-placeholder">
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  );
};

export default OptimizedImage; 