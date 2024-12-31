import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, getDoc } from 'firebase/firestore';
import { db, storage } from '@/firebaseConfig';
import { Album, Photo } from '@/types';
import { usePhotoPermissions } from '@/hooks/usePhotoPermissions';
import { usePhotos } from '@/hooks/usePhotos';
import PhotoEditor from './PhotoEditor';
import PhotoUpload from './PhotoUpload';
import OptimizedImage from './OptimizedImage';
import './AlbumView.css';

interface AlbumViewProps {
  albumId: string;
  onBack: () => void;
}

const AlbumView: React.FC<AlbumViewProps> = ({ albumId, onBack }) => {
  const [album, setAlbum] = useState<Album | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { photos, loading, error } = usePhotos({ albumId });
    const { canEditPhoto } = usePhotoPermissions();

    useEffect(() => {
        const fetchAlbum = async () => {
            try {
        const albumDoc = await getDoc(doc(db, 'albums', albumId));
                if (albumDoc.exists()) {
          setAlbum({ id: albumDoc.id, ...albumDoc.data() } as Album);
                }
            } catch (err) {
        console.error('Error fetching album:', err);
            }
        };

        fetchAlbum();
    }, [albumId]);

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  const handleEditClick = async (photo: Photo) => {
    if (album && await canEditPhoto(photo, album)) {
            setSelectedPhoto(photo);
            setIsEditing(true);
        }
    };

  if (loading) return <div>Ładowanie...</div>;
  if (error) return <div>Błąd: {error}</div>;
  if (!album) return <div>Album nie został znaleziony</div>;

    return (
        <div className="album-view">
      <header className="album-header">
                <button onClick={onBack} className="back-button">
          ← Powrót
                </button>
        <h1>{album.name}</h1>
        {album.location && <p>{album.location}</p>}
      </header>

                    <div className="album-actions">
                        <button 
          onClick={() => setIsUploading(true)}
          className="upload-button"
        >
          Dodaj zdjęcia
                                </button>
            </div>

      <div className="photos-grid">
        {photos.map((photo) => (
          <div key={photo.id} className="photo-item">
                            <OptimizedImage
                                src={photo.url}
              alt={`Zdjęcie ${photo.id}`}
              onClick={() => handlePhotoClick(photo)}
              containerWidth={300}
            />
            <div className="photo-actions">
              <button onClick={() => handleEditClick(photo)}>
                Edytuj
                                </button>
            </div>
                        </div>
                    ))}
                </div>

            {isEditing && selectedPhoto && (
                <PhotoEditor
                    imageUrl={selectedPhoto.url}
                    photo={selectedPhoto}
                    album={album}
                    onClose={() => {
                        setIsEditing(false);
                        setSelectedPhoto(null);
                    }}
                />
            )}

      {isUploading && (
        <PhotoUpload
          albumId={albumId}
          onClose={() => setIsUploading(false)}
          onUploadComplete={() => {
            setIsUploading(false);
            // Odśwież listę zdjęć
          }}
        />
      )}
        </div>
    );
};

export default AlbumView; 