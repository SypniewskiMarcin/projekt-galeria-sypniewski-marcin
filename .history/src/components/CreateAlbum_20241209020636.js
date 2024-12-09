import React, { useState } from 'react';
import { db } from '../firebaseConfig'; // Importuj instancję Firestore
import { collection, addDoc } from 'firebase/firestore';

const CreateAlbum = () => {
    const [albumName, setAlbumName] = useState('');
    const [author, setAuthor] = useState('');
    const [location, setLocation] = useState('');
    const [status, setStatus] = useState('public'); // Domyślny status

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, 'albums'), {
                name: albumName,
                author: author,
                location: location,
                status: status,
                images: [] // Pusty array na zdjęcia
            });
            // Resetuj formularz
            setAlbumName('');
            setAuthor('');
            setLocation('');
            setStatus('public');
        } catch (error) {
            console.error('Błąd dodawania albumu:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input type="text" placeholder="Nazwa albumu" value={albumName} onChange={(e) => setAlbumName(e.target.value)} required />
            <input type="text" placeholder="Autor" value={author} onChange={(e) => setAuthor(e.target.value)} required />
            <input type="text" placeholder="Lokalizacja (opcjonalnie)" value={location} onChange={(e) => setLocation(e.target.value)} />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="public">Publiczne</option>
                <option value="commercial">Komercyjne</option>
                <option value="private">Prywatne</option>
            </select>
            <button type="submit">Stwórz album</button>
        </form>
    );
};

export default CreateAlbum;