// Narzędzia do obsługi i optymalizacji obrazów
const calculateOptimalDimensions = (screenWidth, screenHeight, containerWidth, devicePixelRatio = 1) => {
    // Oblicz optymalną szerokość dla siatki zdjęć
    const gridItemWidth = Math.min(300, containerWidth / 2);
    
    // Uwzględnij gęstość pikseli urządzenia
    const optimalWidth = Math.round(gridItemWidth * devicePixelRatio);
    const optimalHeight = Math.round(gridItemWidth * devicePixelRatio);

    return {
        width: optimalWidth,
        height: optimalHeight
    };
};

// Funkcja do modyfikacji URL obrazu z Firebase Storage
const getOptimizedImageUrl = (originalUrl, width, isThumb = false, naturalAspectRatio = false) => {
    try {
        if (originalUrl.includes('firebasestorage.googleapis.com')) {
            const separator = originalUrl.includes('?') ? '&' : '?';
            
            // Dla naturalnych proporcji nie wymuszamy kwadratu
            if (naturalAspectRatio) {
                return `${originalUrl}${separator}w=${width}&quality=${isThumb ? '40' : '85'}`;
            }
            
            // Dla kwadratów dodajemy crop
            return `${originalUrl}${separator}w=${width}&h=${width}&quality=${isThumb ? '40' : '85'}&fit=crop`;
        }
        return originalUrl;
    } catch (error) {
        console.error('Błąd podczas optymalizacji URL:', error);
        return originalUrl;
    }
};

const preloadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
};

export { calculateOptimalDimensions, getOptimizedImageUrl, preloadImage }; 