import React, { useEffect, useRef } from 'react';
import { usePhotoEditor } from '@/hooks/usePhotoEditor';
import { usePhotoSave } from '@/hooks/usePhotoSave';
import { Photo, Album } from '@/types';
import Alert from './Alert';

interface PhotoEditorProps {
  imageUrl: string;
  photo: Photo;
  album: Album;
  onClose: () => void;
}

export const PhotoEditor: React.FC<PhotoEditorProps> = ({
  imageUrl,
  photo,
  album,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    initCanvas,
    loadImage,
    applyFilter,
    editingOptions,
    undo,
    redo,
    canUndo,
    canRedo
  } = usePhotoEditor();

  const {
    saveOptions,
    setSaveOptions,
    saveEditedPhoto,
    saving,
    error: saveError
  } = usePhotoSave();

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = initCanvas(canvasRef.current);
      loadImage(imageUrl);
    }
  }, [imageUrl, initCanvas, loadImage]);

  const handleSave = async () => {
    if (!canvasRef.current) return;
    
    const imageData = canvasRef.current.toDataURL(
      `image/${saveOptions.format}`,
      saveOptions.quality
    );
    
    await saveEditedPhoto(imageData, photo);
    onClose();
  };

  return (
    <div className="photo-editor">
      <div className="editor-toolbar">
        <button onClick={undo} disabled={!canUndo}>
          Cofnij
        </button>
        <button onClick={redo} disabled={!canRedo}>
          Ponów
        </button>
      </div>

      <div className="editor-main">
        <canvas ref={canvasRef} />
        
        <div className="editor-controls">
          <div className="filter-controls">
            <label>
              Jasność
              <input
                type="range"
                min="-100"
                max="100"
                value={editingOptions.brightness}
                onChange={(e) => applyFilter('brightness', Number(e.target.value))}
              />
            </label>
            {/* Podobne kontrolki dla innych filtrów */}
          </div>

          <div className="save-controls">
            <label>
              <input
                type="checkbox"
                checked={saveOptions.download}
                onChange={(e) => setSaveOptions(prev => ({
                  ...prev,
                  download: e.target.checked
                }))}
              />
              Pobierz
            </label>
            {/* Inne opcje zapisu */}
          </div>
        </div>
      </div>

      <div className="editor-footer">
        <button onClick={handleSave} disabled={saving}>
          {saving ? 'Zapisywanie...' : 'Zapisz'}
        </button>
        <button onClick={onClose}>Anuluj</button>
      </div>

      {saveError && <Alert type="error" message={saveError} />}
    </div>
  );
}; 