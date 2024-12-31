import { useState, useEffect } from 'react';
import { Photo } from '../types';

interface LayoutConfig {
  columns: number;
  gutter: number;
}

interface PhotoLayout extends Photo {
  width: number;
  height: number;
  x: number;
  y: number;
}

export const useGalleryLayout = (photos: Photo[], config: LayoutConfig) => {
  const [layout, setLayout] = useState<PhotoLayout[]>([]);

  useEffect(() => {
    const calculateLayout = () => {
      const { columns, gutter } = config;
      const containerWidth = window.innerWidth;
      const columnWidth = (containerWidth - (gutter * (columns + 1))) / columns;
      
      const newLayout = photos.map((photo, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        
        return {
          ...photo,
          width: columnWidth,
          height: columnWidth, // Zakładamy aspect ratio 1:1
          x: gutter + (column * (columnWidth + gutter)),
          y: gutter + (row * (columnWidth + gutter))
        };
      });

      setLayout(newLayout);
    };

    calculateLayout();
    window.addEventListener('resize', calculateLayout);

    return () => window.removeEventListener('resize', calculateLayout);
  }, [photos, config]);

  return { layout };
}; 