import React, { useState } from 'react';
import './ImageEditor.css';

const ImageEditor = ({ images, onClose, onSave, isOpen }) => {
  console.log('ImageEditor renderowany z props:', { images, isOpen });
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editedImages, setEditedImages] = useState(images || []);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  if (!images || images.length === 0) {
    console.log('Brak zdjęć do edycji');
    return null;
  }

  if (!isOpen) {
    console.log('Editor nie jest otwarty');
    return null;
  }

  console.log('Renderowanie edytora ze zdjęciami:', images);

  const handleSave = async () => {
    try {
      await onSave(currentImageIndex, editedImages[currentImageIndex]);
      onClose();
    } catch (error) {
      console.error('Błąd podczas zapisywania:', error);
    }
  };

  return (
    <div className="image-editor-overlay">
      <div className="image-editor-container">
        <div className="image-editor-header">
          <h2>Edytor zdjęć</h2>
          <button onClick={onClose} className="close-button">✕</button>
        </div>

        <div className="image-editor-content">
          <div className="image-preview">
            <img 
              src={images[currentImageIndex].url} 
              alt="Edytowane zdjęcie"
              style={{
                filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
              }}
            />
          </div>

          <div className="editor-controls">
            <div className="control-group">
              <label>Jasność</label>
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={brightness}
                onChange={(e) => setBrightness(e.target.value)}
              />
            </div>

            <div className="control-group">
              <label>Kontrast</label>
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={contrast}
                onChange={(e) => setContrast(e.target.value)}
              />
            </div>

            <div className="control-group">
              <label>Nasycenie</label>
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={saturation}
                onChange={(e) => setSaturation(e.target.value)}
              />
            </div>
          </div>

          <div className="editor-navigation">
            <button 
              onClick={() => setCurrentImageIndex(prev => prev - 1)}
              disabled={currentImageIndex === 0}
            >
              Poprzednie
            </button>
            <span>{currentImageIndex + 1} / {images.length}</span>
            <button 
              onClick={() => setCurrentImageIndex(prev => prev + 1)}
              disabled={currentImageIndex === images.length - 1}
            >
              Następne
            </button>
          </div>

          <div className="editor-actions">
            <button onClick={handleSave} className="save-button">
              Zapisz zmiany
            </button>
            <button onClick={onClose} className="cancel-button">
              Anuluj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor; 