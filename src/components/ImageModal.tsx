import React, { useEffect, useRef } from 'react';
import './ImageModal.css';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
  showDownloadButton?: boolean;
}

const ImageModal: React.FC<ImageModalProps> = ({ 
  imageUrl, 
  onClose,
  showDownloadButton = false 
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Błąd podczas pobierania zdjęcia:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div ref={modalRef} className="relative max-w-4xl mx-4">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-gray-300"
          aria-label="Zamknij"
        >
          ✕
        </button>
        <img
          src={imageUrl}
          alt="Powiększone zdjęcie"
          className="max-h-[90vh] w-auto object-contain"
        />
        {showDownloadButton && (
          <button
            onClick={handleDownload}
            className="absolute bottom-4 right-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Pobierz
          </button>
        )}
      </div>
    </div>
  );
};

export default ImageModal; 