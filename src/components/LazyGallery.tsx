import React from 'react';
import { useInView } from 'react-intersection-observer';
import OptimizedImage from './OptimizedImage';
import { Photo } from '../types';

interface LazyGalleryProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  layout: any[]; // TODO: Define proper type
}

const LazyGallery: React.FC<LazyGalleryProps> = ({ photos, onPhotoClick, layout }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <div ref={ref} className="relative min-h-screen">
      {inView && layout.map((item, index) => (
        <OptimizedImage
          key={item.id}
          src={item.url}
          alt={item.title || `Zdjęcie ${index + 1}`}
          containerWidth={item.width}
          onClick={() => onPhotoClick(item)}
          priority={index < 4}
        />
      ))}
    </div>
  );
};

export default LazyGallery; 