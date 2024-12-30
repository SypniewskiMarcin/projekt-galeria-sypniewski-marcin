import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '@/firebaseConfig';
import { useAuth } from '@/hooks/useAuth';
import Alert from './Alert';
import LoadingSpinner from './LoadingSpinner';

interface PhotoUploadProps {
  onSuccess?: () => void;
  albumId?: string;
}

/**
 * Komponent PhotoUpload obsługujący przesyłanie zdjęć
 * @param {PhotoUploadProps} props - Właściwości komponentu
 * @returns {JSX.Element} - Wyrenderowany komponent PhotoUpload
 */
const PhotoUpload = ({ onSuccess, albumId }: PhotoUploadProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  /**
   * Obsługa przesyłania pliku
   * @param {File} file - Plik do przesłania
   */
  const handleUpload = async (file: File) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Sprawdzenie typu pliku
      if (!file.type.startsWith('image/')) {
        throw new Error('Można przesyłać tylko pliki graficzne');
      }

      // Utworzenie referencji do Storage
      const storageRef = ref(storage, `photos/${Date.now()}_${file.name}`);
      
      // Przesłanie pliku
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Dodanie informacji o zdjęciu do Firestore
      await addDoc(collection(db, 'photos'), {
        url: downloadURL,
        title: file.name,
        createdAt: serverTimestamp(),
        userId: user?.uid,
        albumId: albumId || null
      });

      setSuccess(true);
      if (onSuccess) onSuccess();
      
      // Wyczyszczenie inputa
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas przesyłania');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Input do wyboru pliku */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        accept="image/*"
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
        disabled={loading}
      />

      {/* Wskaźnik ładowania */}
      {loading && <LoadingSpinner size="sm" />}

      {/* Komunikaty o statusie */}
      {error && (
        <Alert 
          type="error" 
          message={error} 
          onClose={() => setError('')}
        />
      )}
      {success && (
        <Alert 
          type="success" 
          message="Zdjęcie zostało przesłane pomyślnie" 
          onClose={() => setSuccess(false)}
        />
      )}
    </div>
  );
};

export default PhotoUpload; 