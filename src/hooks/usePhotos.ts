import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db, storage } from '@/firebaseConfig';
import { ref, getDownloadURL } from 'firebase/storage';

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

  const fetchPhotoWithStorage = async (path: string) => {
    try {
      const imageRef = ref(storage, path);
      const url = await getDownloadURL(imageRef);
      return url;
    } catch (error) {
      console.error('Błąd podczas pobierania zdjęcia:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const photosQuery = query(
          collection(db, 'photos'),
          ...(albumId ? [where('albumId', '==', albumId)] : []),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(photosQuery);
        const fetchedPhotos = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const data = doc.data();
            if (data.url) {
              try {
                const url = await fetchPhotoWithStorage(data.url);
                return {
                  id: doc.id,
                  ...data,
                  url,
                  createdAt: data.createdAt?.toDate()
                };
              } catch (error) {
                console.error(`Błąd podczas pobierania zdjęcia: ${data.url}`, error);
                return null;
              }
            }
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate()
            };
          })
        ).filter(Boolean) as Photo[];

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