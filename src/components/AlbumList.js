import React from 'react';
import OptimizedImage from './OptimizedImage';
import './AlbumList.css';

const AlbumList = ({ albums, onAlbumClick }) => {
    console.log('AlbumList renderuje się z', albums.length, 'albumami');
    
    return (
        <div className="albums-grid">
            {albums.map(album => {
                console.log('Renderowanie albumu:', {
                    name: album.name,
                    hasCover: !!album.coverPhoto,
                    coverUrl: album.coverPhoto
                });
                return (
                    <div 
                        key={album.id} 
                        className="album-card"
                        onClick={() => onAlbumClick(album.id)}
                        role="button"
                        tabIndex={0}
                    >
                        {album.isPrivate && (
                            <span className="album-privacy-badge">
                                Prywatny
                            </span>
                        )}
                        <div className="album-thumbnail">
                            {album.coverPhoto ? (
                                <img
                                    src={album.coverPhoto}
                                    alt={`Okładka albumu ${album.name}`}
                                    className="album-cover-image"
                                    onError={(e) => {
                                        console.error('Błąd ładowania okładki dla albumu:', album.name);
                                        e.target.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <div className="empty-album-thumbnail">
                                    <span>Pusty</span>
                                </div>
                            )}
                        </div>
                        <div className="album-content">
                            <h3>{album.name}</h3>
                            <p>Autor: {album.author.displayName}</p>
                            {album.location && <p>Lokalizacja: {album.location}</p>}
                            <p>Data publikacji: {new Date(album.createdAt).toLocaleDateString()}</p>
                            {album.creationDate && (
                                <p>Data wydarzenia: {new Date(album.creationDate).toLocaleDateString()}</p>
                            )}
                            {album.categories && (
                                <div className="album-categories">
                                    {album.categories.map(category => (
                                        <span key={category} className="category-tag">
                                            {category}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AlbumList; 