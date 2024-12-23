import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebaseConfig';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import Alert from './Alert';
import JSZip from 'jszip';
import './PaymentProcess.css';

const PHOTO_PRICE = 5; // Cena za zdjęcie w PLN
const ALBUM_DISCOUNT = 0.2; // 20% zniżki przy zakupie całego albumu

const PaymentProcess = ({ 
    selectedPhotos, 
    album, 
    onClose, 
    isFullAlbum = false 
}) => {
    const [paymentMethod, setPaymentMethod] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [error, setError] = useState('');
    
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && !isProcessing && !isCompleted) {
                handleCancel();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isProcessing, isCompleted]);

    const handleCancel = () => {
        if (!isProcessing && !isCompleted) {
            const confirmExit = window.confirm('Czy na pewno chcesz przerwać proces zakupu?');
            if (confirmExit) {
                onClose();
            }
        }
    };

    const calculatePrice = () => {
        const basePrice = (isFullAlbum ? album.photos.length : selectedPhotos.size) * PHOTO_PRICE;
        return isFullAlbum ? basePrice * (1 - ALBUM_DISCOUNT) : basePrice;
    };

    const handlePayment = async () => {
        try {
            setIsProcessing(true);
            
            // Symulacja procesu płatności
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Zapisz transakcję w Firestore
            const transaction = {
                buyerId: auth.currentUser.uid,
                sellerId: album.author.uid,
                albumId: album.id,
                photoIds: isFullAlbum ? album.photos.map(p => p.id) : Array.from(selectedPhotos),
                amount: calculatePrice(),
                status: 'completed',
                paymentMethod: paymentMethod,
                createdAt: new Date().toISOString(),
                isFullAlbum: isFullAlbum
            };

            await addDoc(collection(db, 'transactions'), transaction);
            
            setIsCompleted(true);
            setIsProcessing(false);
        } catch (error) {
            console.error('Błąd podczas przetwarzania płatności:', error);
            setError('Wystąpił błąd podczas przetwarzania płatności.');
            setIsProcessing(false);
        }
    };

    const handleDownload = async () => {
        try {
            setIsProcessing(true);
            const zip = new JSZip();
            const photosToDownload = isFullAlbum ? album.photos : 
                album.photos.filter(p => selectedPhotos.has(p.id));

            for (const photo of photosToDownload) {
                const response = await fetch(photo.url);
                const blob = await response.blob();
                zip.file(`zdjecie_${photo.id}.jpg`, blob);
            }

            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${album.name}_zakupione.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            
            setIsProcessing(false);
            onClose();
        } catch (error) {
            console.error('Błąd podczas pobierania zdjęć:', error);
            setError('Wystąpił błąd podczas pobierania zdjęć.');
            setIsProcessing(false);
        }
    };

    return (
        <div 
            className="payment-process"
            onClick={(e) => {
                if (e.target.className === 'payment-process') {
                    handleCancel();
                }
            }}
        >
            <div className="payment-container">
                <button 
                    className="close-button"
                    onClick={isCompleted ? onClose : handleCancel}
                    disabled={isProcessing}
                    aria-label="Zamknij"
                >
                    ×
                </button>
                
                <h2>Proces zakupu</h2>
                
                <div className="payment-details">
                    <p>Wybrane zdjęcia: {isFullAlbum ? album.photos.length : selectedPhotos.size}</p>
                    <p>Całkowita kwota: {calculatePrice().toFixed(2)} PLN</p>
                    {isFullAlbum && <p>Uwzględniono zniżkę 20% za zakup całego albumu</p>}
                </div>

                {!isCompleted ? (
                    <>
                        <div className="payment-methods">
                            <button
                                className={`payment-method ${paymentMethod === 'blik' ? 'selected' : ''}`}
                                onClick={() => setPaymentMethod('blik')}
                                disabled={true}
                            >
                                BLIK (niedostępne)
                            </button>
                            <button
                                className={`payment-method ${paymentMethod === 'simulation' ? 'selected' : ''}`}
                                onClick={() => setPaymentMethod('simulation')}
                            >
                                Symulacja płatności
                            </button>
                        </div>

                        <div className="payment-actions">
                            <button
                                className="process-payment"
                                onClick={handlePayment}
                                disabled={!paymentMethod || isProcessing}
                            >
                                {isProcessing ? 'Przetwarzanie...' : 'Zapłać'}
                            </button>
                            <button
                                className="cancel-payment"
                                onClick={handleCancel}
                                disabled={isProcessing}
                            >
                                Anuluj
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="payment-completed">
                        <p>Płatność zakończona pomyślnie!</p>
                        <div className="completed-actions">
                            <button
                                className="download-button"
                                onClick={handleDownload}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Przygotowywanie...' : 'Pobierz zdjęcia'}
                            </button>
                            <button
                                className="close-purchase-button"
                                onClick={onClose}
                                disabled={isProcessing}
                            >
                                Zamknij
                            </button>
                        </div>
                    </div>
                )}

                {error && <Alert message={error} type="error" onClose={() => setError('')} />}
            </div>
        </div>
    );
};

export default PaymentProcess; 