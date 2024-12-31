import { useState } from 'react';
import { storage, db } from '@/firebaseConfig';
import { ref, uploadString } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from './useAuth';
import { Photo } from '@/types';

interface SaveOptions {
  download: boolean;
  saveToCloud: boolean;
  format: 'png' | 'jpeg';
  quality: number;
}

export const usePhotoSave = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveOptions, setSaveOptions] = useState<SaveOptions>({
    download: false,
    saveToCloud: true,
    format: 'jpeg',
    quality: 0.8
  });

  const handleDownload = (imageData: string) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `edited_photo.${saveOptions.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveToCloud = async (imageData: string, originalPhoto: Photo) => {
    if (!user) return;

    try {
      setSaving(true);
      setError(null);

      // Zapisz edytowane zdjęcie w Storage
      const editedPhotoRef = ref(storage, `edited/${originalPhoto.id}_${Date.now()}.${saveOptions.format}`);
      await uploadString(editedPhotoRef, imageData, 'data_url');

      // Zaktualizuj dokument zdjęcia w Firestore
      await updateDoc(doc(db, 'photos', originalPhoto.id), {
        editedUrl: editedPhotoRef.fullPath,
        lastEdited: new Date(),
        editedBy: user.uid
      });

    } catch (err) {
      console.error('Error saving edited photo:', err);
      setError('Wystąpił błąd podczas zapisywania zdjęcia');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const saveEditedPhoto = async (imageData: string, originalPhoto: Photo) => {
    try {
      if (saveOptions.download) {
        handleDownload(imageData);
      }

      if (saveOptions.saveToCloud) {
        await saveToCloud(imageData, originalPhoto);
      }
    } catch (err) {
      setError('Wystąpił błąd podczas zapisywania zdjęcia');
      console.error('Error in saveEditedPhoto:', err);
    }
  };

  return {
    saveOptions,
    setSaveOptions,
    saveEditedPhoto,
    saving,
    error
  };
}; 