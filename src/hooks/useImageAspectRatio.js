import { useState, useEffect } from 'react';

export const useImageAspectRatio = (src) => {
    const [aspectRatio, setAspectRatio] = useState(null);

    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            setAspectRatio(img.width / img.height);
        };
        img.src = src;
    }, [src]);

    return aspectRatio;
}; 