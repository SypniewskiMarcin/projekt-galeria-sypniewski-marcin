import React, { useState, useRef } from 'react';
import { storage, db } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Photo } from '../types';

interface PhotoUploadProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ onClose, onUploadComplete }) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);
    }
  };

  const handleUpload = async () => {
    if (!files || !user) return;

    setUploading(true);
    const totalFiles = files.length;
    let completed = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `photos/${user.id}/${Date.now()}_${file.name}`);
        
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);

        const photoData: Omit<Photo, 'id'> = {
          url,
          title: file.name,
          ownerId: user.id,
          isPublic: false,
          metadata: {
            size: file.size,
            format: file.type,
            width: 0, // To be updated after load
            height: 0
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await addDoc(collection(db, 'photos'), photoData);
        
        completed++;
        setProgress((completed / totalFiles) * 100);
      }

      onUploadComplete();
      onClose();
    } catch (error) {
      console.error('Błąd podczas przesyłania:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Dodaj zdjęcia</h2>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg mb-4 hover:border-blue-500"
        >
          Wybierz zdjęcia
        </button>

        {files && (
          <p className="mb-4">
            Wybrano {files.length} {files.length === 1 ? 'zdjęcie' : 'zdjęć'}
          </p>
        )}

        {uploading && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Anuluj
          </button>
          <button
            onClick={handleUpload}
            disabled={!files || uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {uploading ? 'Przesyłanie...' : 'Prześlij'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoUpload; 