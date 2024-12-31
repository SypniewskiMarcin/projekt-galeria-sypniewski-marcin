import React from 'react';
import { Link } from 'react-router-dom';
import { Album } from '@/types';
import OptimizedImage from './OptimizedImage';

interface AlbumListProps {
  albums: Album[];
  onAlbumClick: (albumId: string) => void;
}

const AlbumList: React.FC<AlbumListProps> = ({ albums, onAlbumClick }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {albums.map((album) => (
        <div
          key={album.id}
          className="album-card"
          onClick={() => onAlbumClick(album.id)}
        >
          {album.coverPhoto ? (
            <OptimizedImage
              src={album.coverPhoto}
              alt={album.name}
              containerWidth={300}
              isThumb
            />
          ) : (
            <div className="album-placeholder">
              Brak zdjęcia okładkowego
            </div>
          )}
          
          <div className="album-info">
            <h3>{album.name}</h3>
            {album.location && <p>{album.location}</p>}
            <p className="text-sm text-gray-500">
              Autor: {album.author.displayName}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlbumList; 