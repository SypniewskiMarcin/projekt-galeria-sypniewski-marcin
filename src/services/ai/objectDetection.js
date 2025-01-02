import * as cocoSsd from '@tensorflow-models/coco-ssd';

let model = null;

export const initializeModel = async () => {
    try {
        if (!model) {
            console.log('Inicjalizacja modelu detekcji obiektów...');
            model = await cocoSsd.load();
            console.log('Model załadowany pomyślnie');
        }
        return model;
    } catch (error) {
        console.error('Błąd podczas ładowania modelu:', error);
        throw error;
    }
};

export const detectObjects = async (imageElement) => {
    try {
        const model = await initializeModel();
        const predictions = await model.detect(imageElement);
        return predictions;
    } catch (error) {
        console.error('Błąd podczas detekcji obiektów:', error);
        throw error;
    }
};