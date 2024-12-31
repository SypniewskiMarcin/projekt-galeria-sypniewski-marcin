import { db } from '@/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Album, Photo } from '@/types';

export const useFirestore = () => {
  const getAlbumPhotos = async (albumId: string): Promise<Photo[]> => {
    const photosRef = collection(db, 'albums', albumId, 'photos');
    const snapshot = await getDocs(photosRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Photo[];
  };

  const getUserAlbums = async (userId: string): Promise<Album[]> => {
    const albumsRef = collection(db, 'albums');
    const q = query(albumsRef, where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Album[];
  };

  return {
    getAlbumPhotos,
    getUserAlbums
  };
}; 