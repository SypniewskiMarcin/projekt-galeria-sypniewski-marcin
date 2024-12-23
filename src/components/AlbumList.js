import React from 'react';
import OptimizedImage from './OptimizedImage';
import './AlbumList.css';

const AlbumList = ({ albums, onAlbumClick }) => {
    return (
        <div className="album-list">
            {albums.map(album => (
                <div 
                    key={album.id} 
                    className="album-card"
                    onClick={() => onAlbumClick(album.id)}
                >
                    {album.photos && album.photos.length > 0 ? (
                        <OptimizedImage
                            src={album.photos[0].url}
                            alt={album.name}
                            containerWidth={300}
                            priority={false}
                        />
                    ) : (
                        <div className="empty-album-thumbnail">
                            <span>Brak zdjęć</span>
                        </div>
                    )}
                    <div className="album-info">
                        <h3>{album.name}</h3>
                        <p className="album-author">Autor: {album.author.displayName}</p>
                        <p className="album-date">
                            {new Date(album.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AlbumList; 