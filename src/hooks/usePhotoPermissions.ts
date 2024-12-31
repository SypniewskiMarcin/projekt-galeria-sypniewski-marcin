import { useAuth } from './useAuth';
import { useFirestore } from './useFirestore';
import { Photo, Album } from '@/types';

export const usePhotoPermissions = () => {
  const { user } = useAuth();
  const { getUserAlbums } = useFirestore();

  const canEditPhoto = async (photo: Photo, album: Album): Promise<boolean> => {
    if (!user) return false;

    // Admin może edytować wszystkie zdjęcia
    if (user.role === 'admin') return true;

    // Właściciel albumu może edytować wszystkie zdjęcia w albumie
    if (album?.ownerId === user.uid) return true;

    // Autor zdjęcia może edytować swoje zdjęcia
    if (photo.ownerId === user.uid) return true;

    return false;
  };

  return { canEditPhoto };
}; 