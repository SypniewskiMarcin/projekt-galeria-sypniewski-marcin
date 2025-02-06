import React, { forwardRef } from 'react';
import './BusinessCard.css';

const BusinessCard = forwardRef(({ onClose }, ref) => {
    const [isClosing, setIsClosing] = React.useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    return (
        <div className="business-card-container">
            <div
                ref={ref}
                className={`business-card ${isClosing ? 'closing' : ''}`}
            >
                <div className="business-card-content">
                    <h2 className="company-name">RYSZARD WSZOŁEK ART360</h2>

                    <div className="business-info">
                        <div className="info-item">
                            <span className="label">Imię i nazwisko:</span>
                            <span className="value">Ryszard Wszołek</span>
                        </div>

                        <div className="info-item">
                            <span className="label">NIP:</span>
                            <span className="value">554 257 56 56</span>
                        </div>

                        <div className="info-item">
                            <span className="label">Tel. Kontaktowy:</span>
                            <a href="tel:723022434" className="value link">723 022 434</a>
                        </div>

                        <div className="info-item">
                            <span className="label">Strona:</span>
                            <span className="value">strona w budowie</span>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        className="close-button"
                        aria-label="Zamknij"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
});

export default BusinessCard; 