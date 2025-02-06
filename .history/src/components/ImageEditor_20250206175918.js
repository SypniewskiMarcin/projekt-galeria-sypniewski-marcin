import React, { useState, useRef, useEffect } from 'react';
import './ImageEditor.css';
import { detectObjects } from '../services/ai/objectDetection';
import { enhanceImage, downloadEnhancedImage } from '../services/ai/imageEnhancement';

// Funkcja pomocnicza do wyodrębnienia nazwy pliku z URL
const getFileNameFromUrl = (url) => {
  const urlParts = url.split('/');
  return urlParts[urlParts.length - 1].split('?')[0];
};

const ImageEditor = ({ images, onClose, onSave, isOpen }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [editedImages, setEditedImages] = useState(images || []);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [previewMode, setPreviewMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savingProgress, setSavingProgress] = useState(0);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [isSegmentationPanelOpen, setIsSegmentationPanelOpen] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [backgroundType, setBackgroundType] = useState('blur');
  const [customBackground, setCustomBackground] = useState(null);
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [alertMessage, setAlertMessage] = useState('');
  const [error, setError] = useState(null);
  const [enhancedImageData, setEnhancedImageData] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const imageRef = useRef(null);
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
          console.log(`Rozpoczynam przetwarzanie zdjęcia ${i + 1}:`, currentImage);
          setCurrentImageIndex(i);
          setSavingProgress((i / images.length) * 100);

          let processedImage;
          if (currentImage.isAIEnhanced) {
            // Jeśli obraz był ulepszony przez AI, użyj bezpośrednio zapisanego bloba
            processedImage = {
              ...currentImage,
              editedUrl: currentImage.editedUrl,
              editedBlob: currentImage.editedBlob
            };
          } else {
            // Dla normalnej edycji, zastosuj filtry
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
            processedImage = {
              ...currentImage,
              editedUrl: editedImageUrl,
              editedBlob: blob,
              adjustments: { brightness, contrast, saturation }
            };
          }

          editedImages.push(processedImage);
          console.log(`Zdjęcie ${i + 1} przetworzone pomyślnie`);
        } catch (error) {
          console.error(`Błąd podczas przetwarzania zdjęcia ${i + 1}:`, error);
          throw error;
        }
      }

      console.log('Wszystkie zdjęcia przetworzone, zapisywanie...');

      await Promise.all(
        editedImages.map((img, index) => {
          console.log(`Zapisywanie zdjęcia ${index + 1}:`, img);
          return onSave(index, img);
        })
      );

      setSavingProgress(100);
      console.log('Wszystkie zdjęcia zapisane pomyślnie');

      // Pobierz ulepszony obraz po zapisaniu zmian
      if (enhancedImageData) {
        const currentImage = images[currentImageIndex];
        // Wyciągnij tylko nazwę pliku z URL, pomijając parametry
        const originalFileName = currentImage?.url?.split('/').pop()?.split('?')[0] || 'image.jpg';
        const enhancedFileName = `enhanced-${originalFileName}`;
        downloadEnhancedImage(enhancedImageData, enhancedFileName);
      }

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

  const handleCustomBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCustomBackground(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSuperResolution = async () => {
    try {
      setIsAIProcessing(true);
      setError(null);
      setAlertMessage('');
      const currentImage = images[currentImageIndex];

      console.log('Rozpoczynam ulepszanie AI dla obrazu:', {
        url: currentImage.url,
        albumId: currentImage.albumId,
        fileName: currentImage.url.split('/').pop()
      });

      if (!currentImage || !currentImage.url) {
        throw new Error('Brak obrazu do przetworzenia');
      }

      // Stwórz element obrazu z właściwościami CORS
      const img = new Image();
      img.crossOrigin = 'anonymous';

      console.log('Ładowanie obrazu...');
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log('Obraz załadowany pomyślnie:', {
            width: img.width,
            height: img.height
          });
          resolve();
        };
        img.onerror = (e) => {
          console.error('Błąd ładowania obrazu:', e);
          reject(new Error(`Nie można załadować obrazu: ${e.message || 'nieznany błąd'}`));
        };
        img.src = currentImage.url;
      });

      // Dodaj informację o albumie do elementu obrazu
      img.dataset.albumId = currentImage.albumId;

      console.log('Rozpoczynam proces ulepszania AI...');
      const result = await enhanceImage(img);

      if (!result || !result.canvas) {
        console.error('Nieprawidłowy wynik ulepszania:', result);
        throw new Error('Nie otrzymano przetworzonego obrazu');
      }

      console.log('Ulepszanie zakończone pomyślnie:', {
        originalSize: result.metadata.originalSize,
        enhancedSize: result.metadata.enhancedSize,
        scaleFactor: result.metadata.scaleFactor
      });

      // Aktualizuj stan z ulepszonym obrazem
      setEditedImages(prevImages => {
        const newImages = [...prevImages];
        newImages[currentImageIndex] = {
          ...newImages[currentImageIndex],
          editedUrl: result.metadata.downloadUrl,
          editedBlob: result.metadata.blob,
          isAIEnhanced: true,
          enhancedMetadata: result.metadata
        };
        return newImages;
      });

      setEnhancedImageData(result.metadata);
      setPreviewImage(result.metadata.downloadUrl);
      setAlertMessage('Ulepszanie AI zakończone pomyślnie! Możesz teraz pobrać ulepszony obraz.');

    } catch (error) {
      console.error('Błąd podczas ulepszania AI:', {
        message: error.message,
        stack: error.stack,
        type: error.name
      });
      setError(`Błąd podczas ulepszania AI: ${error.message}`);
      setAlertMessage('Wystąpił błąd podczas przetwarzania obrazu. Spróbuj ponownie później.');
    } finally {
      setIsAIProcessing(false);
    }
  };

  const handleSaveAndDownload = async () => {
    try {
      setIsLoading(true);
      const currentImage = editedImages[currentImageIndex];

      if (currentImage.isAIEnhanced && currentImage.editedBlob) {
        // Pobierz ulepszony obraz
        const filename = `enhanced_${getFileNameFromUrl(currentImage.url)}`;
        await downloadEnhancedImage(enhancedImageData, filename);
        setAlertMessage('Obraz został pomyślnie pobrany!');
      } else {
        // Standardowe zapisywanie
        await handleSave();
      }
    } catch (error) {
      console.error('Błąd podczas zapisywania/pobierania:', error);
      setError(`Błąd podczas zapisywania/pobierania: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadEnhanced = () => {
    if (enhancedImageData) {
      const currentImage = images[currentImageIndex];
      const originalFileName = currentImage?.url?.split('/').pop() || 'image';
      const enhancedFileName = `enhanced-${originalFileName}`;
      downloadEnhancedImage(enhancedImageData, enhancedFileName);
    }
  };

  const handleSegmentation = async () => {
    try {
      setIsAIProcessing(true);
      const currentImage = images[currentImageIndex];

      // Tworzenie elementu obrazu do przetworzenia
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = currentImage.url;
      });

      // Wykrywanie obiektów na obrazie
      const detectedObjects = await detectObjects(img);

      // TODO: Implementacja segmentacji i zmiany tła
      // Na razie tylko logowanie wykrytych obiektów
      console.log('Detected objects:', detectedObjects);

      // Tutaj będzie dalsza implementacja segmentacji
      // w zależności od wybranego typu tła (blur, solid, custom)

    } catch (error) {
      console.error('Błąd podczas segmentacji:', error);
      alert('Wystąpił błąd podczas przetwarzania obrazu');
    } finally {
      setIsAIProcessing(false);
    }
  };

  return (
    <div className="image-editor-overlay">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <div className="loading-text">Przetwarzanie obrazu...</div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <div className="error-title">Wystąpił błąd</div>
            <div className="error-text">{error}</div>
          </div>
          <button onClick={() => setError(null)} className="error-close">✕</button>
        </div>
      )}

      {alertMessage && (
        <div className={`alert-message ${error ? 'alert-error' : 'alert-success'}`}>
          <div className="alert-icon">{error ? '⚠️' : '✓'}</div>
          <div className="alert-content">{alertMessage}</div>
          <button onClick={() => setAlertMessage('')} className="alert-close">✕</button>
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

            <div className="control-group ai-panel">
              <button
                className="panel-toggle"
                onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
              >
                Ulepszanie AI {isAIPanelOpen ? '▼' : '▶'}
              </button>

              {isAIPanelOpen && (
                <div className="ai-controls">
                  <button
                    className={`ai-button ${isAIProcessing ? 'processing' : ''}`}
                    onClick={handleSuperResolution}
                    disabled={isAIProcessing}
                  >
                    {isAIProcessing ? (
                      <>
                        <span className="spinner-icon">🔄</span>
                        <span>Przetwarzanie...</span>
                      </>
                    ) : (
                      'Popraw jakość zdjęcia'
                    )}
                  </button>

                  {enhancedImageData && (
                    <div className="enhanced-image-info">
                      <p>Oryginalne wymiary: {enhancedImageData.originalSize}</p>
                      <p>Ulepszone wymiary: {enhancedImageData.enhancedSize}</p>
                      <button
                        className="save-button"
                        onClick={handleSaveAndDownload}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Zapisywanie...' : 'Zapisz i pobierz'}
                      </button>
                    </div>
                  )}

                  <div className="processing-info">
                    {isAIProcessing && (
                      <div className="ai-progress">
                        <div className="progress-spinner"></div>
                        <div className="progress-text">Przetwarzanie AI w toku...</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="control-group segmentation-panel">
              <button
                className="panel-toggle"
                onClick={() => setIsSegmentationPanelOpen(!isSegmentationPanelOpen)}
              >
                Segmentacja i tło {isSegmentationPanelOpen ? '▼' : '▶'}
              </button>

              {isSegmentationPanelOpen && (
                <div className="segmentation-controls">
                  <select
                    value={backgroundType}
                    onChange={(e) => setBackgroundType(e.target.value)}
                    className="background-select"
                  >
                    <option value="blur">Rozmyte tło</option>
                    <option value="solid">Jednolity kolor</option>
                    <option value="custom">Własne zdjęcie</option>
                  </select>

                  {backgroundType === 'solid' && (
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="color-picker"
                    />
                  )}

                  {backgroundType === 'custom' && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomBackgroundUpload}
                      className="file-input"
                    />
                  )}

                  <button
                    className="segmentation-button"
                    onClick={handleSegmentation}
                    disabled={isAIProcessing}
                  >
                    {isAIProcessing ? 'Przetwarzanie...' : 'Zastosuj efekt'}
                  </button>
                </div>
              )}
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
              {savingProgress > 0 ? 'Zapisywanie...' : 'Zapisz i pobierz'}
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
      {enhancedImageData && (
        <button
          onClick={handleDownloadEnhanced}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
        >
          Pobierz ulepszony obraz
        </button>
      )}
    </div>
  );
};

export default ImageEditor; 