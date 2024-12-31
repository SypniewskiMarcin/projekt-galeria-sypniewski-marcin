import React, { useState } from 'react';
import { PhotoEditor } from './PhotoEditor';
import { usePhotoPermissions } from '../hooks/usePhotoPermissions';

interface PhotoViewProps {
  photo: Photo;
  album: Album;
}

const PhotoView: React.FC<PhotoViewProps> = ({ photo, album }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { canEditPhoto } = usePhotoPermissions();

  return (
    <div className="relative">
      <img 
        src={photo.url} 
        alt="Photo" 
        className="w-full h-auto"
      />
      
      <button
        onClick={() => setIsEditing(true)}
        className="absolute bottom-4 right-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 shadow-lg"
      >
        Edytuj zdjęcie
      </button>

      {isEditing && (
        <PhotoEditor
          imageUrl={photo.url}
          onClose={() => setIsEditing(false)}
          photo={photo}
          album={album}
        />
      )}
    </div>
  );
};

export default PhotoView; 