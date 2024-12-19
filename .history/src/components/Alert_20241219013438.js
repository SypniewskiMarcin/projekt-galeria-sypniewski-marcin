import React, { useEffect, useState } from 'react';
import './Alert.css';

const Alert = ({ message, onClose, type = 'success', duration = 3000 }) => {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const displayTimer = setTimeout(() => {
            // Rozpocznij animację zamykania
            setIsClosing(true);
        }, duration);

        // Gdy animacja zamykania się zakończy, wywołaj onClose
        const closeTimer = setTimeout(() => {
            onClose();
        }, duration + 1500); // 1500ms to czas trwania animacji fadeOutRight

        return () => {
            clearTimeout(displayTimer);
            clearTimeout(closeTimer);
        };
    }, [duration, onClose]);

    return (
        <div
            className={`alert alert-${type} ${isClosing ? 'closing' : ''}`}
            role="alert"
            aria-live="polite"
            onAnimationEnd={() => {
                if (isClosing) {
                    onClose();
                }
            }}
        >
            {message}
        </div>
    );
};

export default Alert;
