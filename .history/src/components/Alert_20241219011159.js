import React, { useEffect } from 'react';

const Alert = ({ message, onClose, type = 'success', duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [onClose, duration]);

    const alertClasses = {
        success: 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in',
        error: 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in',
        info: 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in'
    };

    return (
        <div
            className={alertClasses[type]}
            role="alert"
            aria-live="polite"
        >
            {message}
        </div>
    );
};

export default Alert;
