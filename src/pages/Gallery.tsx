import { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

// Interfejs opisujący strukturę zdjęcia
interface Photo {
  id: string;
  url: string;
  title: string;
  createdAt: Date;
}

const Gallery = () => {
  // Stan komponentu
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Funkcja pobierająca zdjęcia z Firestore
    const fetchPhotos = async () => {
      try {
        // Tworzenie zapytania do kolekcji zdjęć
        const q = query(collection(db, 'photos'));
        const querySnapshot = await getDocs(q);
        
        // Mapowanie dokumentów na obiekty zdjęć
        const fetchedPhotos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        })) as Photo[];
        
        setPhotos(fetchedPhotos);
      } catch (error) {
        console.error('Błąd podczas pobierania zdjęć:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  // Wyświetlanie loadera podczas ładowania danych
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Renderowanie galerii zdjęć
  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8">Galeria Zdjęć</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-shadow"
          >
            {/* Zdjęcie z efektem hover */}
            <img
              src={photo.url}
              alt={photo.title}
              className="w-full h-64 object-cover transition-transform group-hover:scale-105"
            />
            {/* Nakładka z informacjami */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 transform translate-y-full group-hover:translate-y-0 transition-transform">
              <h3 className="text-lg font-semibold">{photo.title}</h3>
              <p className="text-sm">
                {photo.createdAt?.toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Gallery; 