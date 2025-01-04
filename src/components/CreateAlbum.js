import React, { useState, forwardRef } from 'react';
import { db, storage } from '../firebaseConfig';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Alert from './Alert';
import { auth } from '../firebaseConfig';

const CreateAlbum = forwardRef(({ user, onClose, onAlbumCreated }, ref) => {
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB w bajtach
    
    const [formData, setFormData] = useState({
        albumName: '',
        location: '',
        isPublic: true,
        isCommercial: false,
        watermark: false,
        watermarkType: 'text',
        watermarkVisibility: 'visible',
        watermarkFile: null,
        creationDate: new Date().toISOString().split('T')[0],
        categories: []
    });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [showAlert, setShowAlert] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        if (type === 'file') {
            const file = files[0];
            if (file) {
                // Sprawdzanie typu pliku
                if (file.type !== 'image/png') {
                    setError('Dozwolone są tylko pliki PNG.');
                    setShowAlert(true);
                    e.target.value = ''; // Resetuj input
                    return;
                }
                
                // Sprawdzanie rozmiaru pliku
                if (file.size > MAX_FILE_SIZE) {
                    setError('Plik nie może być większy niż 50MB.');
                    setShowAlert(true);
                    e.target.value = ''; // Resetuj input
                    return;
                }

                setFormData(prev => ({
                    ...prev,
                    [name]: file
                }));
                setError(''); // Wyczyść błąd jeśli był
                setShowAlert(false);
            }
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            }));
        }
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

            let watermarkSettings = {
                enabled: formData.watermark,
                type: formData.watermarkType,
                visibility: formData.watermarkVisibility,
                text: currentUser.displayName || '',
                imageUrl: ''
            };

            // Jeśli wybrano watermark typu 'image' i jest plik, najpierw go wgraj
            if (formData.watermark && formData.watermarkType === 'image' && formData.watermarkFile) {
                const watermarkRef = ref(storage, `watermarks/${currentUser.uid}/${formData.watermarkFile.name}`);
                await uploadBytes(watermarkRef, formData.watermarkFile);
                watermarkSettings.imageUrl = await getDownloadURL(watermarkRef);
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
                watermarkSettings,
                photos: []
            };

            const docRef = await addDoc(collection(db, 'albums'), albumData);
            setSuccessMessage('Album został utworzony pomyślnie!');
            setShowAlert(true);
            
            if (onAlbumCreated) {
                setTimeout(() => {
                    onAlbumCreated();
                }, 1500);
            } else {
                setTimeout(() => {
                    onClose();
                }, 1500);
            }
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
        <form 
            ref={ref}
            onSubmit={handleSubmit} 
            className={`create-album-form ${isClosing ? 'closing' : ''}`}
        >
            {error && <p className="error-message" role="alert">{error}</p>}
            {showAlert && (
                <Alert
                    message={successMessage}
                    onClose={() => setShowAlert(false)}
                    type="success"
                />
            )}

            <div className="form-content">
                <input
                    type="text"
                    name="albumName"
                    placeholder="Nazwa albumu"
                    value={formData.albumName}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className="form-input"
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
                    className="form-input"
                    aria-label="Lokalizacja"
                    tabIndex={0}
                />

                <input
                    type="date"
                    name="creationDate"
                    value={formData.creationDate}
                    onChange={handleInputChange}
                    className="form-input"
                    aria-label="Data utworzenia"
                    tabIndex={0}
                />

                <div className="checkbox-group">
                    <input
                        type="checkbox"
                        id="isPublic"
                        className="form-checkbox"
                        checked={formData.isPublic}
                        onChange={handleInputChange}
                        name="isPublic"
                    />
                    <label htmlFor="isPublic">Publiczny</label>
                </div>

                {formData.isPublic && (
                    <div className="checkbox-group">
                        <input
                            type="checkbox"
                            id="isCommercial"
                            className="form-checkbox"
                            checked={formData.isCommercial}
                            onChange={handleInputChange}
                            name="isCommercial"
                        />
                        <label htmlFor="isCommercial">Komercyjny</label>
                    </div>
                )}

                <div className="checkbox-group">
                    <input
                        type="checkbox"
                        id="hasWatermark"
                        className="form-checkbox"
                        checked={formData.hasWatermark}
                        onChange={handleInputChange}
                        name="hasWatermark"
                    />
                    <label htmlFor="hasWatermark">Dodaj znak wodny</label>
                </div>

                {formData.hasWatermark && (
                    <div className="watermark-options">
                        <div className="radio-group">
                            <label>
                                <input
                                    type="radio"
                                    name="watermarkVisibility"
                                    value="visible"
                                    checked={formData.watermarkVisibility === 'visible'}
                                    onChange={handleInputChange}
                                    className="form-radio"
                                />
                                Widoczny znak wodny
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="watermarkVisibility"
                                    value="hidden"
                                    checked={formData.watermarkVisibility === 'hidden'}
                                    onChange={handleInputChange}
                                    className="form-radio"
                                />
                                Ukryty znak wodny
                            </label>
                        </div>

                        <div className="radio-group mt-4">
                            <label>
                                <input
                                    type="radio"
                                    name="watermarkType"
                                    value="text"
                                    checked={formData.watermarkType === 'text'}
                                    onChange={handleInputChange}
                                    className="form-radio"
                                />
                                Tekst (nazwa użytkownika)
                            </label>
                            <label>
                                <input
                                    type="radio"
                                    name="watermarkType"
                                    value="image"
                                    checked={formData.watermarkType === 'image'}
                                    onChange={handleInputChange}
                                    className="form-radio"
                                />
                                Własny plik PNG
                            </label>
                        </div>

                        {formData.watermarkType === 'image' && (
                            <>
                                <input
                                    type="file"
                                    name="watermarkFile"
                                    onChange={handleInputChange}
                                    accept=".png"
                                    className="form-input"
                                    aria-label="Wybierz plik watermarku"
                                />
                                <p className="file-info">Maksymalny rozmiar pliku: 50MB. Tylko format PNG.</p>
                            </>
                        )}
                    </div>
                )}

                <div className="form-buttons">
                    <button
                        type="submit"
                        className="submit-button"
                        tabIndex={0}
                    >
                        Utwórz album
                    </button>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="cancel-button"
                        tabIndex={0}
                    >
                        Anuluj
                    </button>
                </div>
            </div>
        </form>
    );
});

export default CreateAlbum;