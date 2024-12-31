import React from 'react';
import { motion } from 'framer-motion';
import OptimizedImage from './OptimizedImage';
import { Photo } from '../types';

interface AnimatedGalleryProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  layout: any[]; // TODO: Define proper type
}

const AnimatedGallery: React.FC<AnimatedGalleryProps> = ({ photos, onPhotoClick, layout }) => {
  return (
    <div className="relative">
      {layout.map((item, index) => (
        <motion.div
          key={item.id}
          layout
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'absolute',
            top: item.y,
            left: item.x,
            width: item.width,
            height: item.height
          }}
        >
          <OptimizedImage
            src={item.url}
            alt={item.title || `Zdjęcie ${index + 1}`}
            containerWidth={item.width}
            onClick={() => onPhotoClick(item)}
            priority={index < 4}
          />
        </motion.div>
      ))}
    </div>
  );
};

export default AnimatedGallery; 