import React, { useState, useRef, useEffect } from 'react';
import './ImageEditor.css';

const ImageEditor = ({ images, onClose, onSave, isOpen }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editedImages, setEditedImages] = useState(images || []);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [previewMode, setPreviewMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const previewContainerRef = useRef(null);
  const canvasRef = useRef(null);
  const [savingProgress, setSavingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (previewMode && !isProcessing && images?.length > 0) {
        const updatePreview = async () => {
            setIsProcessing(true);
            try {
                await applyFilters();
            } catch (error) {
                console.error('Błąd podczas aktualizacji podglądu:', error);
            } finally {
                setIsProcessing(false);
            }
        };
        updatePreview();
    }
  }, [brightness, contrast, saturation, previewMode, images]);

  useEffect(() => {
    if (previewMode && canvasRef.current) {
        const updateCanvas = async () => {
            try {
                await applyFilters();
            } catch (error) {
                console.error('Błąd podczas aktualizacji canvas:', error);
            }
        };
        updateCanvas();
    }
  }, [currentImageIndex, previewMode]);

  if (!images || images.length === 0) {
    console.log('Brak zdjęć do edycji');
    return null;
  }

  if (!isOpen) {
    console.log('Editor nie jest otwarty');
    return null;
  }

  console.log('Renderowanie edytora ze zdjęciami:', images);

  const applyFilters = async (imageUrl) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
        });
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.drawImage(img, 0, 0);
        
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            r = r / 255;
            g = g / 255;
            b = b / 255;
            
            if (brightness !== 100) {
                const factor = brightness / 100;
                r *= factor;
                g *= factor;
                b *= factor;
            }
            
            if (contrast !== 100) {
                const contrastFactor = (contrast - 100) / 100;
                
                const adjustContrast = (value) => {
                    value = value - 0.5;
                    value = value * (1 + contrastFactor);
                    value = value + 0.5;
                    return value;
                };
                
                r = adjustContrast(r);
                g = adjustContrast(g);
                b = adjustContrast(b);
            }
            
            if (saturation !== 100) {
                const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                const saturationFactor = saturation / 100;
                r = luminance + (r - luminance) * saturationFactor;
                g = luminance + (g - luminance) * saturationFactor;
                b = luminance + (b - luminance) * saturationFactor;
            }
            
            r = Math.min(1, Math.max(0, r));
            g = Math.min(1, Math.max(0, g));
            b = Math.min(1, Math.max(0, b));
            
            data[i] = Math.round(r * 255);
            data[i + 1] = Math.round(g * 255);
            data[i + 2] = Math.round(b * 255);
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        return canvas;
    } catch (error) {
        console.error('Błąd podczas przetwarzania obrazu:', error);
        throw error;
    }
  };

  const verifyEffects = async (canvas) => {
    const ctx = canvas.getContext('2d');
    const processedData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    const verifyCanvas = document.createElement('canvas');
    const verifyCtx = verifyCanvas.getContext('2d');
    verifyCanvas.width = canvas.width;
    verifyCanvas.height = canvas.height;
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise(resolve => {
        img.onload = resolve;
        img.src = images[currentImageIndex].url;
    });
    
    verifyCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    verifyCtx.drawImage(img, 0, 0);
    
    const cssData = verifyCtx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    let totalDiff = 0;
    for (let i = 0; i < processedData.length; i += 4) {
        totalDiff += Math.abs(processedData[i] - cssData[i]);
        totalDiff += Math.abs(processedData[i + 1] - cssData[i + 1]);
        totalDiff += Math.abs(processedData[i + 2] - cssData[i + 2]);
    }
    
    const avgDiff = totalDiff / (processedData.length / 4) / 3;
    console.log('Średnia różnica między efektami:', avgDiff);
    
    return avgDiff < 5;
  };

  const handleSave = async () => {
    try {
        setSavingProgress(0);
        setIsLoading(true);
        const editedImages = [];
        
        for (let i = 0; i < images.length; i++) {
            try {
                const currentImage = images[i];
                console.log(`Rozpoczynam przetwarzanie zdjęcia ${i + 1}:`, currentImage.url);
                setCurrentImageIndex(i);
                setSavingProgress((i / images.length) * 100);
                
                const canvas = await applyFilters(currentImage.url);
                if (!canvas) {
                    throw new Error(`Nie udało się przetworzyć zdjęcia ${i + 1}`);
                }
                
                const blob = await new Promise((resolve, reject) => {
                    canvas.toBlob(
                        blob => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error(`Nie udało się utworzyć blob dla zdjęcia ${i + 1}`));
                            }
                        },
                        'image/jpeg',
                        0.95
                    );
                });

                const editedImageUrl = URL.createObjectURL(blob);
                editedImages.push({
                    ...currentImage,
                    editedUrl: editedImageUrl,
                    editedBlob: blob,
                    adjustments: { brightness, contrast, saturation }
                });

                console.log(`Zdjęcie ${i + 1} przetworzone pomyślnie`);
            } catch (error) {
                console.error(`Błąd podczas przetwarzania zdjęcia ${i + 1}:`, error);
                throw error;
            }
        }

        console.log('Wszystkie zdjęcia przetworzone, zapisywanie...');
        
        await Promise.all(
            editedImages.map((img, index) => {
                console.log(`Zapisywanie zdjęcia ${index + 1}:`, img.url);
                return onSave(index, img);
            })
        );

        setSavingProgress(100);
        console.log('Wszystkie zdjęcia zapisane pomyślnie');
        
        setPreviewMode(false);
        onClose();
    } catch (error) {
        console.error('Błąd podczas zapisywania:', error);
        setPreviewMode(false);
        alert(`Wystąpił błąd podczas zapisywania zmian: ${error.message}`);
    } finally {
        setIsLoading(false);
        setSavingProgress(0);
    }
  };

  const SaveProgress = () => (
    savingProgress > 0 && (
      <div className="save-progress">
        <div className="progress-bar" style={{ width: `${savingProgress}%` }} />
        <span>Zapisywanie: {Math.round(savingProgress)}%</span>
      </div>
    )
  );

  return (
    <div className="image-editor-overlay">
        {isLoading && (
            <div className="loading-overlay">
                <div className="loading-spinner">Przetwarzanie...</div>
            </div>
        )}
        <div className="image-editor-container">
          <div className="image-editor-header">
            <h2>Edytor zdjęć</h2>
            <button onClick={onClose} className="close-button">✕</button>
          </div>

          <div className="image-editor-content">
            <div className="image-preview" ref={previewContainerRef}>
              {previewMode ? (
                  <canvas 
                      ref={canvasRef}
                      style={{ 
                          maxWidth: '100%', 
                          maxHeight: '60vh',
                          display: 'block',
                          margin: '0 auto'
                      }}
                  />
              ) : (
                  <img 
                      src={images[currentImageIndex].url} 
                      alt="Edytowane zdjęcie"
                      style={{
                          filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
                      }}
                  />
              )}
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

              <button 
                  className="preview-button"
                  onClick={() => setPreviewMode(!previewMode)}
                  disabled={isProcessing}
              >
                  {isProcessing ? 'Przetwarzanie...' : 
                   previewMode ? 'Pokaż oryginał' : 'Podgląd zmian'}
              </button>
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
              <SaveProgress />
              <button 
                onClick={handleSave} 
                className="save-button"
                disabled={savingProgress > 0}
              >
                {savingProgress > 0 ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
              <button 
                onClick={onClose} 
                className="cancel-button"
                disabled={savingProgress > 0}
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
    </div>
  );
};

export default ImageEditor; 