import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

const CreateAlbum = ({ user, onClose }) => {
    const [formData, setFormData] = useState({
        albumName: '',
        location: '',
        isPublic: true,
        isCommercial: false,
        watermark: false,
        creationDate: new Date().toISOString().split('T')[0]
    });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.albumName) {
            setError('Nazwa albumu jest wymagana.');
            return;
        }

        try {
            // Sprawdzamy stan użytkownika
            console.log('Stan użytkownika:', {
                isLoggedIn: !!user,
                uid: user?.uid,
                displayName: user?.displayName
            });

            if (!user || !user.uid) {
                throw new Error('Użytkownik nie jest zalogowany');
            }

            // Generujemy bezpieczniejsze ID albumu
            const timestamp = new Date().getTime();
            const safeAlbumName = formData.albumName.replace(/[^a-zA-Z0-9]/g, '_');
            const albumId = `${safeAlbumName}_${timestamp}_${user.uid.slice(0, 5)}`;

            console.log('Przygotowywanie danych albumu:', { albumId });

            const albumData = {
                name: formData.albumName,
                author: user.displayName || 'Anonim',
                location: formData.location || '',
                creationDate: formData.creationDate,
                isPublic: formData.isPublic,
                isCommercial: formData.isCommercial,
                watermark: formData.watermark,
                createdBy: user.uid,
                createdAt: new Date().toISOString(),
                id: albumId,
                updatedAt: new Date().toISOString()
            };

            console.log('Dane albumu do zapisania:', albumData);

            // Próba dodania dokumentu
            const albumRef = doc(db, 'albums', albumId);

            console.log('Rozpoczęcie zapisu do Firestore...');
            await setDoc(albumRef, albumData, { merge: true });
            console.log('Zapis do Firestore zakończony sukcesem');

            setSuccessMessage('Album został dodany pomyślnie!');
            setError('');

            // Resetowanie formularza
            setFormData({
                albumName: '',
                location: '',
                isPublic: true,
                isCommercial: false,
                watermark: false,
                creationDate: new Date().toISOString().split('T')[0]
            });

            // Zamknięcie formularza
            if (typeof onClose === 'function') {
                onClose();
            }
        } catch (error) {
            console.error('Szczegóły błędu:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });

            let errorMessage = 'Wystąpił błąd podczas dodawania albumu: ';

            // Mapowanie konkretnych błędów na przyjazne dla użytkownika komunikaty
            switch (error.code) {
                case 'permission-denied':
                    errorMessage += 'Brak uprawnień do wykonania tej operacji.';
                    break;
                case 'unauthenticated':
                    errorMessage += 'Użytkownik nie jest zalogowany.';
                    break;
                default:
                    errorMessage += error.message || 'Spróbuj ponownie później.';
            }

            setError(errorMessage);
            setSuccessMessage('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            {error && <p className="mb-4 text-red-500 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-green-500 text-sm">{successMessage}</p>}

            <div className="space-y-4">
                <input
                    type="text"
                    name="albumName"
                    placeholder="Nazwa albumu"
                    value={formData.albumName}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Nazwa albumu"
                    required
                    tabIndex={0}
                />

                <input
                    type="text"
                    name="location"
                    placeholder="Lokalizacja (opcjonalnie)"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Lokalizacja"
                    tabIndex={0}
                />

                <input
                    type="date"
                    name="creationDate"
                    value={formData.creationDate}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Data utworzenia"
                    tabIndex={0}
                />

                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        name="isPublic"
                        checked={formData.isPublic}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        aria-label="Album publiczny"
                        tabIndex={0}
                    />
                    <label className="text-sm text-gray-700">Publiczny</label>
                </div>

                {formData.isPublic && (
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            name="isCommercial"
                            checked={formData.isCommercial}
                            onChange={handleInputChange}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            aria-label="Album komercyjny"
                            tabIndex={0}
                        />
                        <label className="text-sm text-gray-700">Komercyjny</label>
                    </div>
                )}

                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        name="watermark"
                        checked={formData.watermark}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        aria-label="Dodaj znak wodny"
                        tabIndex={0}
                    />
                    <label className="text-sm text-gray-700">Dodaj watermark</label>
                </div>

                <div className="flex space-x-4">
                    <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        tabIndex={0}
                    >
                        Utwórz album
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        tabIndex={0}
                    >
                        Anuluj
                    </button>
                </div>
            </div>
        </form>
    );
};

export default CreateAlbum;