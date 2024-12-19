import React, { useEffect, useState } from 'react';
import './Alert.css';

const Alert = ({ message, onClose, type = 'success', duration = 3000 }) => {
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsClosing(true);
            // Czekamy na zakończenie animacji przed zamknięciem
            setTimeout(onClose, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [onClose, duration]);

    return (
        <div
            className={`alert alert-${type} ${isClosing ? 'closing' : ''}`}
            role="alert"
            aria-live="polite"
        >
            {message}
        </div>
    );
};

export default Alert;
