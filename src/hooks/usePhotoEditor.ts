import { useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { storage } from '@/firebaseConfig';
import { useAuth } from './useAuth';
import { Photo, Album } from '@/types';

interface EditingOptions {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  filters: string[];
}

interface EditorState {
  canvas: fabric.Canvas | null;
  editingOptions: EditingOptions;
  history: string[];
  currentStep: number;
}

export const usePhotoEditor = () => {
  const { user } = useAuth();
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [editingOptions, setEditingOptions] = useState<EditingOptions>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    filters: []
  });
  const [history, setHistory] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(-1);

  const initCanvas = useCallback((canvasElement: HTMLCanvasElement) => {
    const newCanvas = new fabric.Canvas(canvasElement);
    setCanvas(newCanvas);
    return newCanvas;
  }, []);

  const loadImage = useCallback(async (imageUrl: string) => {
    if (!canvas) return;

    fabric.Image.fromURL(imageUrl, (img) => {
      canvas.setWidth(img.width as number);
      canvas.setHeight(img.height as number);
      canvas.add(img);
      canvas.renderAll();
      
      // Zapisz pierwszy stan do historii
      const initialState = canvas.toDataURL();
      setHistory([initialState]);
      setCurrentStep(0);
    });
  }, [canvas]);

  const applyFilter = useCallback((filterType: string, value: number) => {
    if (!canvas) return;

    const image = canvas.getObjects()[0] as fabric.Image;
    if (!image) return;

    setEditingOptions(prev => ({
      ...prev,
      [filterType]: value
    }));

    // Zastosuj filtry
    image.filters = [];
    
    if (editingOptions.brightness !== 0) {
      image.filters.push(new fabric.Image.filters.Brightness({ brightness: editingOptions.brightness }));
    }
    if (editingOptions.contrast !== 0) {
      image.filters.push(new fabric.Image.filters.Contrast({ contrast: editingOptions.contrast }));
    }
    // ... inne filtry

    image.applyFilters();
    canvas.renderAll();

    // Zapisz stan do historii
    const newState = canvas.toDataURL();
    setHistory(prev => [...prev.slice(0, currentStep + 1), newState]);
    setCurrentStep(prev => prev + 1);
  }, [canvas, editingOptions, currentStep]);

  const undo = useCallback(() => {
    if (currentStep > 0 && canvas) {
      setCurrentStep(prev => prev - 1);
      fabric.Image.fromURL(history[currentStep - 1], (img) => {
        canvas.clear();
        canvas.add(img);
        canvas.renderAll();
      });
    }
  }, [canvas, history, currentStep]);

  const redo = useCallback(() => {
    if (currentStep < history.length - 1 && canvas) {
      setCurrentStep(prev => prev + 1);
      fabric.Image.fromURL(history[currentStep + 1], (img) => {
        canvas.clear();
        canvas.add(img);
        canvas.renderAll();
      });
    }
  }, [canvas, history, currentStep]);

  return {
    canvas,
    initCanvas,
    loadImage,
    applyFilter,
    editingOptions,
    undo,
    redo,
    canUndo: currentStep > 0,
    canRedo: currentStep < history.length - 1
  };
}; 