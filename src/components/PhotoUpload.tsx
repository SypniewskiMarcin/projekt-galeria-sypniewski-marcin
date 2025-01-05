import React, { useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '../firebaseConfig';
import { updateDoc, doc, arrayUnion } from 'firebase/firestore';
import ProgressBar from './ProgressBar';

interface PhotoUploadProps {
    albumId: string;
    hasWatermark: boolean;
    onUploadComplete: () => void;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ albumId, hasWatermark, onUploadComplete }) => {
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [uploadMessage, setUploadMessage] = useState<string>('');
    const [isUploading, setIsUploading] = useState<boolean>(false);

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);
        setUploadMessage('Przygotowywanie do przesyłania...');

        try {
            const totalFiles = files.length;
            let uploadedFiles = 0;

            for (const file of files) {
                // Upload do folderu photo-original
                const originalRef = ref(storage, `albums/${albumId}/photo-original/${file.name}`);
                await uploadBytes(originalRef, file, {
                    customMetadata: {
                        originalName: file.name,
                        uploadedAt: new Date().toISOString()
                    }
                });

                const originalUrl = await getDownloadURL(originalRef);

                // Aktualizacja dokumentu albumu
                await updateDoc(doc(db, 'albums', albumId), {
                    photos: arrayUnion({
                        name: file.name,
                        originalUrl,
                        uploadedAt: new Date().toISOString(),
                        processed: false
                    })
                });

                uploadedFiles++;
                const progress = Math.round((uploadedFiles / totalFiles) * 100);
                setUploadProgress(progress);
                setUploadMessage(`Przesłano ${uploadedFiles} z ${totalFiles} zdjęć...`);
            }

            setUploadMessage('Wszystkie zdjęcia zostały przesłane!');
            setTimeout(() => {
                setIsUploading(false);
                if (onUploadComplete) onUploadComplete();
            }, 2000);

        } catch (error) {
            console.error('Błąd podczas przesyłania:', error);
            setUploadMessage('Wystąpił błąd podczas przesyłania.');
            setTimeout(() => setIsUploading(false), 3000);
        }
    }, [albumId, onUploadComplete]);

    return (
        <div className="w-full">
            <input
                type="file"
                multiple
                accept="image/jpeg,image/jpg"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                aria-label="Wybierz zdjęcia do przesłania"
            />
            {isUploading && (
                <ProgressBar 
                    progress={uploadProgress} 
                    message={uploadMessage} 
                />
            )}
        </div>
    );
};

export default PhotoUpload; 