import { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

interface Album {
  id: string;
  name: string;
  coverUrl: string;
  photoCount: number;
  createdAt: Date;
}

const Albums = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const q = query(collection(db, 'albums'));
        const querySnapshot = await getDocs(q);
        const fetchedAlbums = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        })) as Album[];
        
        setAlbums(fetchedAlbums);
      } catch (error) {
        console.error('Błąd podczas pobierania albumów:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlbums();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8">Albumy</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {albums.map((album) => (
          <div
            key={album.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
          >
            <img
              src={album.coverUrl}
              alt={album.name}
              className="w-full h-48 object-cover"
            />
            <div className="p-4">
              <h3 className="text-xl font-semibold mb-2">{album.name}</h3>
              <p className="text-gray-600">
                {album.photoCount} zdjęć
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Utworzono: {album.createdAt?.toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Albums; 