import { useState, useEffect } from 'react';

const useGalleryLayout = (photos, containerWidth) => {
    const [layout, setLayout] = useState([]);

    useEffect(() => {
        const calculateLayout = () => {
            const targetHeight = 300; // Docelowa wysokość rzędu
            let currentRow = [];
            let rows = [];
            let rowWidth = 0;

            photos.forEach((photo) => {
                const aspectRatio = photo.width / photo.height;
                const scaledWidth = targetHeight * aspectRatio;
                
                if (rowWidth + scaledWidth > containerWidth && currentRow.length > 0) {
                    // Zakończ aktualny rząd
                    rows.push(currentRow);
                    currentRow = [];
                    rowWidth = 0;
                }

                currentRow.push({
                    ...photo,
                    calculatedWidth: scaledWidth,
                    calculatedHeight: targetHeight
                });
                rowWidth += scaledWidth;
            });

            if (currentRow.length > 0) {
                rows.push(currentRow);
            }

            // Dostosuj szerokości w każdym rzędzie
            const finalLayout = rows.map(row => {
                const rowRatio = containerWidth / row.reduce((sum, photo) => sum + photo.calculatedWidth, 0);
                return row.map(photo => ({
                    ...photo,
                    calculatedWidth: photo.calculatedWidth * rowRatio,
                    calculatedHeight: targetHeight
                }));
            });

            setLayout(finalLayout);
        };

        calculateLayout();
    }, [photos, containerWidth]);

    return layout;
}; 