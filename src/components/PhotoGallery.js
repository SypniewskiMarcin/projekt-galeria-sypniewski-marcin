import Gallery from 'react-photo-gallery';

const PhotoGallery = ({ photos }) => {
    const galleryPhotos = photos.map(photo => ({
        src: photo.url,
        width: photo.width,
        height: photo.height
    }));

    return (
        <Gallery
            photos={galleryPhotos}
            direction="column"
            margin={4}
            onClick={(e, { photo }) => handlePhotoClick(photo)}
        />
    );
}; 