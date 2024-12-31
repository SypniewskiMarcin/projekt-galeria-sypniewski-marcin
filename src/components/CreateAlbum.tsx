import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { User } from '@/types';

interface CreateAlbumProps {
  onAlbumCreated: () => void;
  user: User;
  onClose: () => void;
}

const CreateAlbum: React.FC<CreateAlbumProps> = ({ onAlbumCreated, user, onClose }) => {
  const [name, setName] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [isCommercial, setIsCommercial] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Nazwa albumu jest wymagana');
      return;
    }

    try {
      await addDoc(collection(db, 'albums'), {
        name,
        location,
        isPublic,
        isCommercial,
        categories,
        createdAt: new Date(),
        author: {
          uid: user.uid,
          displayName: user.displayName
        },
        photos: []
      });

      setName('');
      setLocation('');
      setIsPublic(false);
      setIsCommercial(false);
      setCategories([]);
      setError('');
      onAlbumCreated();
      onClose();
    } catch (err) {
      setError('Wystąpił błąd podczas tworzenia albumu');
      console.error('Error creating album:', err);
    }
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = Array.from(e.target.selectedOptions, option => option.value);
    setCategories(value);
  };

  return (
    <form onSubmit={handleSubmit} className="create-album-form">
      <h2>Utwórz nowy album</h2>
      
      <div className="form-group">
        <label htmlFor="albumName">Nazwa albumu:</label>
        <input
          type="text"
          id="albumName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="location">Lokalizacja:</label>
        <input
          type="text"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="categories">Kategorie:</label>
        <select
          multiple
          id="categories"
          value={categories}
          onChange={handleCategoryChange}
        >
          <option value="sportowa">Sportowa</option>
          <option value="krajobrazowa">Krajobrazowa</option>
          <option value="eventowa">Eventowa</option>
          <option value="reportażowa">Reportażowa</option>
          <option value="nocna">Nocna</option>
          <option value="uliczna">Uliczna</option>
          <option value="portretowa">Portretowa</option>
          <option value="produktowa">Produktowa</option>
          <option value="kulinarna">Kulinarna</option>
        </select>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Album publiczny
        </label>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={isCommercial}
            onChange={(e) => setIsCommercial(e.target.checked)}
          />
          Album komercyjny
        </label>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="form-buttons">
        <button type="submit" className="submit-button">
          Utwórz album
        </button>
        <button type="button" onClick={onClose} className="cancel-button">
          Anuluj
        </button>
      </div>
    </form>
  );
};

export default CreateAlbum; 