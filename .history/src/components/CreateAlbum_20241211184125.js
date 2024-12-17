import React, { useState } from 'react';
import { db } from '../firebaseConfig'; // Importuj instancję Firestore
import { doc, setDoc } from 'firebase/firestore';
import './CreateAlbum.css'; // Importuj style dla CreateAlbum

const CreateAlbum = ({ user, onClose }) => {
    const [albumName, setAlbumName] = useState('');
    const [location, setLocation] = useState('');
    const [isPublic, setIsPublic] = useState(true);
    const [isCommercial, setIsCommercial] = useState(false);
    const [watermark, setWatermark] = useState(false);
    const [creationDate, setCreationDate] = useState(new Date().toISOString().split('T')[0]);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!albumName) {
            setError('Nazwa albumu jest wymagana.');
            return;
        }
        const albumRef = doc(db, 'albums', albumName); // Użyj nazwy albumu jako ID
        await setDoc(albumRef, {
            name: albumName,
            author: user.displayName,
            location,
            creationDate,
            isPublic,
            isCommercial,
            watermark,
            createdBy: user.uid,
        });
        // Resetuj formularz
        setAlbumName('');
        setLocation('');
        setIsPublic(true);
        setIsCommercial(false);
        setWatermark(false);
        setCreationDate(new Date().toISOString().split('T')[0]);
        setError(''); // Resetuj błąd
        onClose(); // Zamknij formularz po utworzeniu albumu
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <p className="error-message">{error}</p>} {/* Wyświetl komunikat o błędzie */}
            <input
                type="text"
                placeholder="Nazwa albumu"
                value={albumName}
                onChange={(e) => setAlbumName(e.target.value)}
                required
            />
            <input
                type="text"
                placeholder="Lokalizacja (opcjonalnie)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
            />
            <input
                type="date"
                value={creationDate}
                onChange={(e) => setCreationDate(e.target.value)}
            />
            <label>
                <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={() => setIsPublic(!isPublic)}
                />
                Publiczny
            </label>
            {isPublic && (
                <label>
                    <input
                        type="checkbox"
                        checked={isCommercial}
                        onChange={() => setIsCommercial(!isCommercial)}
                    />
                    Komercyjny
                </label>
            )}
            <label>
                <input
                    type="checkbox"
                    checked={watermark}
                    onChange={() => setWatermark(!watermark)}
                />
                Dodaj watermark
            </label>
            <button type="submit">Utwórz album</button>
            <button type="button" onClick={onClose}>Anuluj</button> {/* Przycisk do zamknięcia formularza */}
        </form>
    );
};

export default CreateAlbum;