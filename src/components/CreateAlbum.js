import React, { useState } from 'react';
import { db, storage } from '../firebaseConfig';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { ref } from 'firebase/storage';
import Alert from './Alert';
import { auth } from '../firebaseConfig';

const CreateAlbum = ({ user, onClose }) => {
    const [formData, setFormData] = useState({
        albumName: '',
        location: '',
        isPublic: true,
        isCommercial: false,
        watermark: false,
        creationDate: new Date().toISOString().split('T')[0],
        categories: []
    });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showAlert, setShowAlert] = useState(false);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            // Walidacja nazwy albumu
            if (formData.albumName.length < 3) {
                setError('Nazwa albumu musi mieć co najmniej 3 znaki');
                setShowAlert(true);
                return;
            }
            
            if (formData.albumName.length > 100) {
                setError('Nazwa albumu nie może przekraczać 100 znaków');
                setShowAlert(true);
                return;
            }

            // Walidacja lokalizacji
            if (formData.location && formData.location.length > 100) {
                setError('Nazwa lokalizacji nie może przekraczać 100 znaków');
                setShowAlert(true);
                return;
            }

            const currentUser = auth.currentUser;
            if (!currentUser) {
                setError('Użytkownik nie jest zalogowany');
                setShowAlert(true);
                return;
            }

            const albumData = {
                name: formData.albumName,
                author: {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName
                },
                createdAt: new Date().toISOString(),
                eventDate: formData.creationDate,
                location: formData.location,
                isPublic: formData.isPublic,
                isCommercial: formData.isCommercial,
                commercialSettings: formData.isCommercial ? {
                    albumPrice: 0,
                    singlePhotoPrice: 0
                } : null,
                watermarkSettings: {
                    enabled: formData.watermark,
                    type: 'visible',
                    text: ''
                },
                photos: []
            };

            const docRef = await addDoc(collection(db, 'albums'), albumData);
            setSuccessMessage('Album został utworzony pomyślnie!');
            setShowAlert(true);
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Błąd tworzenia albumu:', error);
            setError('Wystąpił błąd podczas tworzenia albumu.');
            setShowAlert(true);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            {error && <p className="mb-4 text-red-500 text-sm" role="alert">{error}</p>}
            {showAlert && (
                <Alert
                    message={successMessage}
                    onClose={() => setShowAlert(false)}
                    type="success"
                />
            )}

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
                        className="create-button flex-1"
                        tabIndex={0}
                    >
                        Utwórz album
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cancel-button flex-1"
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