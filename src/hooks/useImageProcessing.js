import { useState, useCallback } from 'react';

export const useImageProcessing = (initialImage) => {
    const [adjustments, setAdjustments] = useState({
        brightness: 100,
        contrast: 100,
        saturation: 100,
        exposure: 0,
        highlights: 0,
        shadows: 0,
        temperature: 0,
        clarity: 0,
        blur: 0,
        sharpen: 0
    });

    const applyAdjustments = useCallback((canvas) => {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            // Brightness
            const brightnessAdjust = (adjustments.brightness - 100) / 100;
            data[i] += data[i] * brightnessAdjust;     // R
            data[i+1] += data[i+1] * brightnessAdjust; // G
            data[i+2] += data[i+2] * brightnessAdjust; // B

            // Contrast
            const contrastFactor = (adjustments.contrast + 100) / 100;
            data[i] = ((data[i] - 128) * contrastFactor) + 128;     // R
            data[i+1] = ((data[i+1] - 128) * contrastFactor) + 128; // G
            data[i+2] = ((data[i+2] - 128) * contrastFactor) + 128; // B

            // Saturation
            const saturationFactor = adjustments.saturation / 100;
            const gray = 0.2989 * data[i] + 0.5870 * data[i+1] + 0.1140 * data[i+2];
            data[i] = gray * (1 - saturationFactor) + data[i] * saturationFactor;     // R
            data[i+1] = gray * (1 - saturationFactor) + data[i+1] * saturationFactor; // G
            data[i+2] = gray * (1 - saturationFactor) + data[i+2] * saturationFactor; // B
        }

        ctx.putImageData(imageData, 0, 0);
    }, [adjustments]);

    return {
        adjustments,
        setAdjustments,
        applyAdjustments
    };
}; 