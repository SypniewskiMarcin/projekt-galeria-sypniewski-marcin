import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db, storage } from '@/firebaseConfig';
import { ref, getDownloadURL } from 'firebase/storage';
import { Photo } from '@/types';

interface UsePhotosProps {
  albumId?: string;
  userId?: string;
}

export const usePhotos = ({ albumId, userId }: UsePhotosProps) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const photosRef = collection(db, 'photos');
        let q = query(photosRef, orderBy('createdAt', 'desc'));

        if (albumId) {
          q = query(q, where('albumId', '==', albumId));
        }

        if (userId) {
          q = query(q, where('ownerId', '==', userId));
        }

        const snapshot = await getDocs(q);
        const fetchedPhotos = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            try {
              const url = await getDownloadURL(ref(storage, data.path));
              return {
                id: doc.id,
                url,
                createdAt: data.createdAt,
                ...data
              };
            } catch (err) {
              console.error(`Error fetching URL for photo ${doc.id}:`, err);
              return null;
            }
          })
        ).then(results => results.filter(Boolean) as Photo[]);

        setPhotos(fetchedPhotos);
        setError(null);
      } catch (err) {
        console.error('Error fetching photos:', err);
        setError('Wystąpił błąd podczas pobierania zdjęć');
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [albumId, userId]);

  return { photos, loading, error };
}; 