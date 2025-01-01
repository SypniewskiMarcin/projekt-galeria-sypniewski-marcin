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

  if (!images || images.length === 0) {
    console.log('Brak zdjęć do edycji');
    return null;
  }

  if (!isOpen) {
    console.log('Editor nie jest otwarty');
    return null;
  }

  console.log('Renderowanie edytora ze zdjęciami:', images);

  const applyFilters = async () => {
    if (!canvasRef.current) {
        console.error('Canvas nie jest dostępny');
        return null;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Nie można uzyskać kontekstu 2D');
        return null;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    try {
        // Ładowanie obrazu
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = images[currentImageIndex].url;
        });
        
        // Ustaw wymiary canvas
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Wyczyść canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Narysuj oryginalny obraz
        ctx.drawImage(img, 0, 0);
        
        // Pobierz dane pikseli
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;
        
        // Aplikuj filtry na poziomie pikseli
        for (let i = 0; i < data.length; i += 4) {
            // Pobierz wartości RGB
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            
            // Konwertuj do przestrzeni sRGB
            r = r / 255;
            g = g / 255;
            b = b / 255;
            
            // Jasność - liniowa transformacja
            if (brightness !== 100) {
                const factor = brightness / 100;
                r *= factor;
                g *= factor;
                b *= factor;
            }
            
            // Kontrast - poprawiona implementacja
            if (contrast !== 100) {
                // Przeskaluj wartość kontrastu do zakresu -1 do 1
                const contrastFactor = (contrast - 100) / 100;
                
                // Funkcja do aplikowania kontrastu
                const adjustContrast = (value) => {
                    // Przesuń punkt środkowy do 0
                    value = value - 0.5;
                    // Zastosuj kontrast
                    value = value * (1 + contrastFactor);
                    // Przesuń z powrotem
                    value = value + 0.5;
                    return value;
                };
                
                r = adjustContrast(r);
                g = adjustContrast(g);
                b = adjustContrast(b);
            }
            
            // Nasycenie - bez zmian
            if (saturation !== 100) {
                const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                const saturationFactor = saturation / 100;
                r = luminance + (r - luminance) * saturationFactor;
                g = luminance + (g - luminance) * saturationFactor;
                b = luminance + (b - luminance) * saturationFactor;
            }
            
            // Zapewnij, że wartości są w zakresie 0-1 przed konwersją do 0-255
            r = Math.min(1, Math.max(0, r));
            g = Math.min(1, Math.max(0, g));
            b = Math.min(1, Math.max(0, b));
            
            // Konwertuj z powrotem do przestrzeni 0-255
            data[i] = Math.round(r * 255);
            data[i + 1] = Math.round(g * 255);
            data[i + 2] = Math.round(b * 255);
            // Alpha pozostaje bez zmian
        }
        
        // Zastosuj przetworzone dane
        ctx.putImageData(imageData, 0, 0);
        
        return canvas;
    } catch (error) {
        console.error('Błąd podczas przetwarzania obrazu:', error);
        throw error;
    }
  };

  const verifyEffects = async (canvas) => {
    // Pobierz dane z canvas po zastosowaniu efektów
    const ctx = canvas.getContext('2d');
    const processedData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    // Stwórz canvas z efektami CSS dla porównania
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
    
    // Porównaj wyniki
    let totalDiff = 0;
    for (let i = 0; i < processedData.length; i += 4) {
        totalDiff += Math.abs(processedData[i] - cssData[i]);
        totalDiff += Math.abs(processedData[i + 1] - cssData[i + 1]);
        totalDiff += Math.abs(processedData[i + 2] - cssData[i + 2]);
    }
    
    const avgDiff = totalDiff / (processedData.length / 4) / 3;
    console.log('Średnia różnica między efektami:', avgDiff);
    
    return avgDiff < 5; // Akceptujemy różnicę mniejszą niż 5 jednostek na kanał
  };

  const handleSave = async () => {
    try {
        const canvas = await applyFilters();
        
        // Sprawdź czy efekty są zgodne z podglądem
        const effectsMatch = await verifyEffects(canvas);
        if (!effectsMatch) {
            console.warn('Uwaga: Efekty mogą się różnić od podglądu');
        }
        
        // Konwertuj canvas na blob z obsługą błędów
        const blob = await new Promise((resolve, reject) => {
            try {
                canvas.toBlob(
                    blob => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Nie udało się utworzyć blob'));
                        }
                    },
                    'image/jpeg',
                    0.95
                );
            } catch (error) {
                reject(error);
            }
        });

        // Utwórz URL dla edytowanego obrazu
        const editedImageUrl = URL.createObjectURL(blob);
        
        const editedImage = {
            ...images[currentImageIndex],
            editedUrl: editedImageUrl,
            editedBlob: blob,
            adjustments: { brightness, contrast, saturation }
        };

        await onSave(currentImageIndex, editedImage);
        onClose();
    } catch (error) {
        console.error('Błąd podczas zapisywania:', error);
        alert('Wystąpił błąd podczas zapisywania zmian. Spróbuj ponownie.');
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