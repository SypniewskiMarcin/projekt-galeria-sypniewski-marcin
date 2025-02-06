import * as tf from '@tensorflow/tfjs';
import { getAuth } from 'firebase/auth';
import { app } from '../firebase';

let model = null;
let isModelLoaded = false;

// Cache dla modelu
let modelCache = null;

// Inicjalizacja TensorFlow.js i modelu ESRGAN
const initTensorFlow = async () => {
    if (!isModelLoaded) {
        try {
            await tf.ready();
            console.log('TensorFlow.js initialized successfully');

            if (modelCache) {
                model = modelCache;
                isModelLoaded = true;
                console.log('Using cached ESRGAN model');
                return;
            }

            try {
                const modelPath = process.env.PUBLIC_URL + '/models/esrgan/model.json';
                console.log('Loading model from:', modelPath);

                const modelResponse = await fetch(modelPath);
                if (!modelResponse.ok) {
                    throw new Error(`Failed to load model: ${modelResponse.statusText}`);
                }

                model = await tf.loadGraphModel(modelPath);
                modelCache = model; // Zapisz w cache
                isModelLoaded = true;
                console.log('ESRGAN model loaded and cached successfully');
            } catch (modelError) {
                console.error('Error loading AI model:', modelError);
                model = null;
                isModelLoaded = true;
                console.log('Using fallback enhancement...');
            }
        } catch (error) {
            console.error('Error initializing AI:', error);
            throw error;
        }
    }
};

// Przygotowanie obrazu do przetworzenia przez model
const preprocessImage = (imageData) => {
    return tf.tidy(() => {
        // Konwertuj do tensora i normalizuj wartości do zakresu [0, 1]
        const tensor = tf.browser.fromPixels(imageData)
            .toFloat()
            .div(tf.scalar(255.0));

        // Sprawdź rozmiar obrazu i przeskaluj jeśli jest za duży
        const MAX_DIMENSION = 1024;
        const [height, width] = tensor.shape;

        if (height > MAX_DIMENSION || width > MAX_DIMENSION) {
            const scale = MAX_DIMENSION / Math.max(height, width);
            return tf.image.resizeBilinear(tensor, [
                Math.round(height * scale),
                Math.round(width * scale)
            ]);
        }

        return tensor.expandDims(0);
    });
};

// Przetworzenie wyniku modelu z powrotem na obraz
const postprocessTensor = (tensor) => {
    return tf.tidy(() => {
        return tensor
            .squeeze()
            .mul(tf.scalar(255.0))
            .clipByValue(0, 255)
            .cast('int32');
    });
};

// Funkcja fallback do podstawowego przetwarzania obrazu
const enhanceImageFallback = async (imageElement) => {
    // Oblicz docelowe wymiary
    const targetWidth = imageElement.width * 4;
    const targetHeight = imageElement.height * 4;

    // Przetwarzaj obraz w mniejszych fragmentach, jeśli jest duży
    const CHUNK_SIZE = 512; // Rozmiar fragmentu do przetwarzania

    return tf.tidy(() => {
        // Konwertuj do tensora i normalizuj
        const tensor = tf.browser.fromPixels(imageElement)
            .toFloat()
            .div(255.0);

        // Jeśli obraz jest mały, przetwórz go w całości
        if (targetWidth <= CHUNK_SIZE && targetHeight <= CHUNK_SIZE) {
            return processImageChunk(tensor, targetWidth, targetHeight);
        }

        // Dla dużych obrazów, przetwarzaj w częściach
        const numChunksX = Math.ceil(targetWidth / CHUNK_SIZE);
        const numChunksY = Math.ceil(targetHeight / CHUNK_SIZE);

        const chunkResults = [];
        for (let y = 0; y < numChunksY; y++) {
            const rowChunks = [];
            for (let x = 0; x < numChunksX; x++) {
                // Oblicz wymiary aktualnego fragmentu
                const startX = x * (imageElement.width / numChunksX);
                const startY = y * (imageElement.height / numChunksY);
                const chunkWidth = Math.min(imageElement.width / numChunksX, imageElement.width - startX);
                const chunkHeight = Math.min(imageElement.height / numChunksY, imageElement.height - startY);

                // Wytnij fragment
                const chunk = tf.slice(tensor, [Math.floor(startY), Math.floor(startX), 0],
                    [Math.ceil(chunkHeight), Math.ceil(chunkWidth), 3]);

                // Przetwórz fragment
                const processedChunk = processImageChunk(
                    chunk,
                    Math.ceil(chunkWidth * 4),
                    Math.ceil(chunkHeight * 4)
                );

                rowChunks.push(processedChunk);
                tf.dispose(chunk);
            }
            // Połącz fragmenty w poziomie
            const rowTensor = tf.concat(rowChunks, 1);
            chunkResults.push(rowTensor);
            rowChunks.forEach(chunk => tf.dispose(chunk));
        }

        // Połącz wszystkie wiersze
        const result = tf.concat(chunkResults, 0);
        chunkResults.forEach(chunk => tf.dispose(chunk));

        return result;
    });
};

// Funkcja do przetwarzania pojedynczego fragmentu obrazu
const processImageChunk = (tensor, targetWidth, targetHeight) => {
    return tf.tidy(() => {
        // Przeskaluj fragment z zachowaniem jakości
        const upscaled = tf.image.resizeBilinear(tensor, [targetHeight, targetWidth], true);

        // Mocniejsze wyostrzanie
        const sharpenKernel = tf.tensor2d([
            [-0.5, -0.5, -0.5],
            [-0.5, 5.0, -0.5],
            [-0.5, -0.5, -0.5]
        ]); // Mocniejszy efekt wyostrzania

        // Przetwórz każdy kanał osobno
        const channels = tf.split(upscaled.expandDims(0), 3, 3);
        const enhancedChannels = channels.map(channel => {
            const convolved = tf.conv2d(
                channel,
                sharpenKernel.expandDims(2).expandDims(3),
                1,
                'same'
            );
            return convolved.clipByValue(0, 1);
        });

        // Połącz kanały i przygotuj końcowy tensor
        return tf.concat(enhancedChannels, 3)
            .squeeze()
            .mul(255.0)
            .clipByValue(0, 255)
            .cast('int32');
    });
};

export const enhanceImage = async (imageElement) => {
    try {
        console.log('Starting AI image enhancement...');
        console.log('Original dimensions:', imageElement.width, 'x', imageElement.height);

        // Przygotuj URL do funkcji Cloud Function
        const functionUrl = 'https://us-central1-projekt-galeria-sypniewski-m.cloudfunctions.net/enhanceImage';

        // Pobierz token autoryzacyjny z Firebase Auth
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error('User not authenticated');
        }
        const token = await currentUser.getIdToken();

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'image/png',
                'Authorization': `Bearer ${token}`,
                'Origin': window.location.origin
            },
            mode: 'cors',
            body: JSON.stringify({
                imageUrl: imageElement.src,
                albumId: imageElement.dataset.albumId || null
            })
        });

        if (!response.ok) {
            console.error('Server response:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error details:', errorText);
            throw new Error(`Server enhancement failed: ${response.statusText}`);
        }

        // Otrzymaj ulepszony obraz jako blob
        const enhancedBlob = await response.blob();
        const enhancedImageUrl = URL.createObjectURL(enhancedBlob);

        // Sprawdź wymiary ulepszonego obrazu
        const enhancedImg = new Image();
        await new Promise((resolve, reject) => {
            enhancedImg.onload = resolve;
            enhancedImg.onerror = reject;
            enhancedImg.src = enhancedImageUrl;
        });

        console.log('Enhancement completed');
        console.log('Enhanced dimensions:', enhancedImg.width, 'x', enhancedImg.height);

        // Stwórz canvas o wymiarach 4x większych
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = imageElement.width * 4;
        outputCanvas.height = imageElement.height * 4;
        const ctx = outputCanvas.getContext('2d');

        // Rysuj ulepszony obraz na canvas
        ctx.drawImage(enhancedImg, 0, 0, outputCanvas.width, outputCanvas.height);

        const metadata = {
            originalSize: `${imageElement.width}x${imageElement.height}`,
            enhancedSize: `${outputCanvas.width}x${outputCanvas.height}`,
            scaleFactor: 4,
            downloadUrl: enhancedImageUrl,
            blob: enhancedBlob
        };

        return {
            canvas: outputCanvas,
            metadata: metadata
        };
    } catch (error) {
        console.error('AI enhancement error:', error);
        throw new Error(`AI enhancement failed: ${error.message}`);
    }
};

export const downloadEnhancedImage = async (metadata, filename) => {
    try {
        const link = document.createElement('a');
        link.href = metadata.downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Download error:', error);
        throw new Error(`Download failed: ${error.message}`);
    }
};

// Funkcja do sprawdzania czy model jest gotowy
export const isAIReady = () => isModelLoaded;