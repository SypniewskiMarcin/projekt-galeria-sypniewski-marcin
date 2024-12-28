import { motion, AnimatePresence } from 'framer-motion';

const AnimatedGallery = ({ photos, layout }) => {
    return (
        <div className="gallery-container">
            <AnimatePresence>
                {photos.map((photo) => (
                    <motion.div
                        key={photo.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                            opacity: { duration: 0.3 },
                            layout: { duration: 0.3 }
                        }}
                        className="photo-item"
                        style={{
                            width: layout === 'natural' ? 'auto' : '100%',
                            aspectRatio: layout === 'natural' ? 'auto' : '1'
                        }}
                    >
                        <OptimizedImage
                            src={photo.url}
                            alt={photo.title}
                            naturalAspectRatio={layout === 'natural'}
                        />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}; 