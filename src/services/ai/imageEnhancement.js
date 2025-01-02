import * as tf from '@tensorflow/tfjs';

// Inicjalizacja TensorFlow.js
let isInitialized = false;

const initTensorFlow = async () => {
    if (!isInitialized) {
        try {
            await tf.ready();
            console.log('TensorFlow.js initialized successfully');
            isInitialized = true;
        } catch (error) {
            console.error('Error initializing TensorFlow.js:', error);
            throw error;
        }
    }
};

export const enhanceImage = async (imageElement) => {
    try {
        // Upewnij się, że TensorFlow.js jest zainicjalizowany
        await initTensorFlow();
        
        console.log('Starting image enhancement...');
        console.log('Image dimensions:', imageElement.width, 'x', imageElement.height);
        
        // Konwertuj obraz do tensora
        const tensor = tf.tidy(() => {
            // Konwertuj obraz do tensora i normalizuj do zakresu [0, 1]
            const imageTensor = tf.browser.fromPixels(imageElement).toFloat().div(255);
            console.log('Image converted to tensor and normalized');
            
            // Zwiększ rozdzielczość 2x
            const upscaled = tf.image.resizeBilinear(imageTensor, [
                imageElement.height * 2,
                imageElement.width * 2
            ]);
            console.log('Image upscaled');
            
            // Przygotuj kernel do wyostrzenia (zmniejszone wartości dla lepszej stabilności)
            const sharpenKernel = tf.tensor3d([
                [[-0.1, -0.1, -0.1],
                 [-0.1,  1.8, -0.1],
                 [-0.1, -0.1, -0.1]],
                [[-0.1, -0.1, -0.1],
                 [-0.1,  1.8, -0.1],
                 [-0.1, -0.1, -0.1]],
                [[-0.1, -0.1, -0.1],
                 [-0.1,  1.8, -0.1],
                 [-0.1, -0.1, -0.1]]
            ], [3, 3, 3]);
            
            // Zastosuj wyostrzenie
            const enhanced = tf.conv2d(
                upscaled.expandDims(0),
                sharpenKernel.expandDims(3),
                1,
                'same'
            ).squeeze();
            
            // Normalizuj wartości
            const normalized = tf.clipByValue(enhanced, 0, 1);
            
            console.log('Image enhanced');
            return normalized;
        });
        
        // Konwersja wyniku do canvas
        const canvas = document.createElement('canvas');
        canvas.width = imageElement.width * 2;
        canvas.height = imageElement.height * 2;
        
        // Konwertuj tensor z powrotem do zakresu [0, 255] podczas konwersji do pikseli
        const uint8Tensor = tf.tidy(() => tensor.mul(255).cast('int32'));
        await tf.browser.toPixels(uint8Tensor, canvas);
        uint8Tensor.dispose();
        console.log('Image converted to canvas');
        
        // Czyszczenie pamięci
        tensor.dispose();
        
        return canvas;
    } catch (error) {
        console.error('Detailed error during image enhancement:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        throw new Error(`Failed to enhance image: ${error.message}`);
    }
};