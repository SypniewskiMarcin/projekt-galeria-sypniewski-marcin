import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Album } from '../types';
import { useAuth } from '../hooks/useAuth';
import AlbumList from '../components/AlbumList';
import CreateAlbum from '../components/CreateAlbum';

const Albums: React.FC = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { user } = useAuth();

  const fetchAlbums = async () => {
    try {
      const q = query(
        collection(db, 'albums'),
        where('isPublic', '==', true)
      );
      
      if (user) {
        q = query(
          collection(db, 'albums'),
          where('ownerId', '==', user.id)
        );
      }

      const querySnapshot = await getDocs(q);
      const fetchedAlbums = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Album[];

      setAlbums(fetchedAlbums);
    } catch (err) {
      console.error('Error fetching albums:', err);
      setError('Wystąpił błąd podczas pobierania albumów');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
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
        <h1 className="text-2xl font-bold">Albumy</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Utwórz album
        </button>
      </div>

      <AlbumList 
        albums={albums}
        onAlbumClick={(albumId) => {/* handle album click */}}
      />

      {isCreateModalOpen && (
        <CreateAlbum
          onClose={() => setIsCreateModalOpen(false)}
          onAlbumCreated={() => {
            setIsCreateModalOpen(false);
            fetchAlbums();
          }}
        />
      )}
    </div>
  );
};

export default Albums; 