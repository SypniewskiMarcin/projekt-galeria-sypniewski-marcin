import React, { useEffect } from 'react';
import './Alert.css'; // Importuj style

const Alert = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(); // Zamknij alert po 5 sekundach
        }, 5000);

        return () => clearTimeout(timer); // Wyczyść timer po odmontowaniu
    }, [onClose]);

    return (
        <div className="alert">
            {message}
        </div>
    );
};

export default Alert;
