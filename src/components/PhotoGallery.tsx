import React, { useState } from 'react';
import { Photo } from '@/types';
import OptimizedImage from '@/components/OptimizedImage';
import ImageModal from '@/components/ImageModal';

interface PhotoGalleryProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, onPhotoClick }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const handlePhotoClick = (photo: Photo) => {
    if (onPhotoClick) {
      onPhotoClick(photo);
    } else {
      setSelectedPhoto(photo);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="photo-item">
          <OptimizedImage
            src={photo.url}
            alt={photo.title || 'Zdjęcie'}
            onClick={() => handlePhotoClick(photo)}
            containerWidth={300}
          />
        </div>
      ))}

      {selectedPhoto && (
        <ImageModal
          imageUrl={selectedPhoto.url}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  );
};

export default PhotoGallery; 