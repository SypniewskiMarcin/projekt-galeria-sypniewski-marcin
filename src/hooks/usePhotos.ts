import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface Photo {
  id: string;
  url: string;
  title: string;
  createdAt: Date;
  userId: string;
  albumId?: string;
}

/**
 * Hook do pobierania i zarządzania zdjęciami
 * @param {string} albumId - Opcjonalne ID albumu do filtrowania
 * @returns {Object} - Obiekt zawierający zdjęcia i stan ładowania
 */
export const usePhotos = (albumId?: string) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        // Tworzenie zapytania z opcjonalnym filtrowaniem po albumId
        const photosQuery = query(
          collection(db, 'photos'),
          ...(albumId ? [where('albumId', '==', albumId)] : []),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(photosQuery);
        const fetchedPhotos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        })) as Photo[];

        setPhotos(fetchedPhotos);
        setError(null);
      } catch (err) {
        setError('Błąd podczas pobierania zdjęć');
        console.error('Błąd podczas pobierania zdjęć:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [albumId]);

  return { photos, loading, error };
}; 