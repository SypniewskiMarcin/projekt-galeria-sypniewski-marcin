import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Photo } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import PhotoGallery from '@/components/PhotoGallery';
import PhotoUpload from '@/components/PhotoUpload';

const Gallery: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuth();

  const fetchPhotos = async () => {
    try {
      let q = query(
        collection(db, 'photos'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc')
      );

      if (user) {
        q = query(
          collection(db, 'photos'),
          where('ownerId', '==', user.id),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      const fetchedPhotos = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Photo[];

      setPhotos(fetchedPhotos);
    } catch (err) {
      console.error('Error fetching photos:', err);
      setError('Wystąpił błąd podczas pobierania zdjęć');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [user]);

  if (loading) {
    return <div>Ładowanie...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Galeria</h1>
        <button
          onClick={() => setIsUploading(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Dodaj zdjęcia
        </button>
      </div>

      <PhotoGallery photos={photos} />

      {isUploading && (
        <PhotoUpload
          onClose={() => setIsUploading(false)}
          onUploadComplete={() => {
            setIsUploading(false);
            fetchPhotos();
          }}
        />
      )}
    </div>
  );
};

export default Gallery; 