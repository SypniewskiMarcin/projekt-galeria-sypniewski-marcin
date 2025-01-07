import React, { useState, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db, auth } from '../firebaseConfig';
import { updateDoc, doc, arrayUnion, getDoc } from 'firebase/firestore';
import ProgressBar from './ProgressBar';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface PhotoUploadProps {
    albumId: string;
    hasWatermark: boolean;
    onUploadComplete: () => void;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({ albumId, hasWatermark, onUploadComplete }) => {
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [uploadMessage, setUploadMessage] = useState<string>('');
    const [isUploading, setIsUploading] = useState<boolean>(false);

    const processWatermark = async (filePath: string) => {
        try {
            console.log('Rozpoczynam przetwarzanie watermarku dla:', filePath);
            
            // Pobierz aktualne ustawienia watermarku z albumu
            const albumDoc = await getDoc(doc(db, 'albums', albumId));
            if (!albumDoc.exists()) {
                throw new Error('Album nie istnieje');
            }
            const albumData = albumDoc.data();
            
            const functions = getFunctions();
            const processWatermarkFunction = httpsCallable(functions, 'processWatermark');
            
            const idToken = await auth.currentUser?.getIdToken();
            
            const result = await processWatermarkFunction({ 
                filePath,
                albumId,
                watermarkSettings: albumData.watermarkSettings,
                metadata: {
                    authorId: auth.currentUser?.uid,
                    authorEmail: auth.currentUser?.email,
                    timestamp: new Date().toISOString(),
                    fileName: filePath.split('/').pop(),
                    idToken
                }
            });

            console.log('Watermark processing result:', result.data);
            return result.data;
        } catch (error) {
            console.error('Error processing watermark:', error);
            throw error;
        }
    };

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
                const timestamp = Date.now();
                const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const fileName = `${timestamp}_${safeFileName}`;
                const filePath = `albums/${albumId}/photo-original/${fileName}`;

                console.log('Rozpoczynam upload pliku:', {
                    fileName,
                    filePath,
                    hasWatermark,
                    albumId
                });

                // Upload do folderu photo-original
                const originalRef = ref(storage, filePath);
                await uploadBytes(originalRef, file, {
                    customMetadata: {
                        originalName: file.name,
                        uploadedAt: new Date().toISOString()
                    }
                });

                const originalUrl = await getDownloadURL(originalRef);
                console.log('Plik został przesłany, URL:', originalUrl);

                // Aktualizacja dokumentu albumu
                await updateDoc(doc(db, 'albums', albumId), {
                    photos: arrayUnion({
                        name: fileName,
                        originalUrl,
                        uploadedAt: new Date().toISOString(),
                        processed: false
                    })
                });
                console.log('Zaktualizowano dokument albumu');

                // Jeśli album ma włączony watermark, wywołaj processWatermark
                if (hasWatermark) {
                    console.log('Album ma włączony watermark, rozpoczynam przetwarzanie');
                    try {
                        const watermarkResult = await processWatermark(filePath);
                        console.log('Watermark został przetworzony:', watermarkResult);

                        // Aktualizuj status przetwarzania w albumie
                        await updateDoc(doc(db, 'albums', albumId), {
                            [`processingStatus.${fileName}`]: {
                                status: 'completed',
                                completedAt: new Date().toISOString()
                            }
                        });
                    } catch (error) {
                        console.error('Błąd podczas przetwarzania watermarku:', error);
                        
                        // Zapisz informację o błędzie w albumie
                        await updateDoc(doc(db, 'albums', albumId), {
                            [`processingStatus.${fileName}`]: {
                                status: 'error',
                                error: error.message,
                                errorCode: error.code,
                                failedAt: new Date().toISOString()
                            }
                        });
                    }
                } else {
                    console.log('Album nie ma włączonego watermarku');
                }

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
    }, [albumId, hasWatermark, onUploadComplete]);

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