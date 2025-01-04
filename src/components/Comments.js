import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { FaStar, FaTrash, FaRegStar, FaUserCircle } from 'react-icons/fa';
import './Comments.css';

const MAX_COMMENT_LENGTH = 500;

const Comments = ({ albumId, photoId = null }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [rating, setRating] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    const [hasRated, setHasRated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hoverRating, setHoverRating] = useState(0);
    const [commentText, setCommentText] = useState('');

    useEffect(() => {
        fetchComments();
        checkUserRating();
    }, [albumId, photoId]);

    const fetchComments = async () => {
        try {
            const commentsRef = collection(db, 'comments');
            const q = query(
                commentsRef,
                where('albumId', '==', albumId),
                photoId ? where('photoId', '==', photoId) : where('photoId', '==', null),
                orderBy('createdAt', 'desc')
            );
            
            const snapshot = await getDocs(q);
            const fetchedComments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setComments(fetchedComments);
            
            // Oblicz średnią ocenę
            const ratings = fetchedComments.filter(comment => comment.rating > 0);
            if (ratings.length > 0) {
                const avg = ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length;
                setAverageRating(Math.round(avg * 10) / 10);
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Błąd podczas pobierania komentarzy:', error);
            setLoading(false);
        }
    };

    const checkUserRating = async () => {
        if (!auth.currentUser) return;
        
        const commentsRef = collection(db, 'comments');
        const q = query(
            commentsRef,
            where('albumId', '==', albumId),
            photoId ? where('photoId', '==', photoId) : where('photoId', '==', null),
            where('userId', '==', auth.currentUser.uid),
            where('rating', '>', 0)
        );
        
        const snapshot = await getDocs(q);
        setHasRated(!snapshot.empty);
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!auth.currentUser) {
            console.error('Użytkownik nie jest zalogowany');
            return;
        }
        
        try {
            const commentData = {
                albumId,
                photoId: photoId || null,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                content: commentText,
                rating: rating || 0,
                createdAt: new Date().toISOString()
            };
            
            const docRef = await addDoc(collection(db, 'comments'), commentData);
            console.log('Komentarz dodany pomyślnie:', docRef.id);
            
            setCommentText('');
            setRating(0);
            await fetchComments();
        } catch (error) {
            console.error('Szczegóły błędu:', {
                code: error.code,
                message: error.message,
                details: error
            });
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!auth.currentUser) return;
        
        try {
            const commentRef = doc(db, 'comments', commentId);
            await deleteDoc(commentRef);
            await fetchComments();
        } catch (error) {
            console.error('Błąd podczas usuwania komentarza:', error);
        }
    };

    const StarRating = ({ value, onHover, onClick }) => {
        return (
            <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        className="star-button"
                        onMouseEnter={() => onHover(star)}
                        onMouseLeave={() => onHover(0)}
                        onClick={() => onClick(star)}
                        type="button"
                        aria-label={`Oceń na ${star} gwiazdek`}
                    >
                        {star <= (hoverRating || value) ? (
                            <FaStar className="w-6 h-6 text-yellow-400" />
                        ) : (
                            <FaRegStar className="w-6 h-6 text-gray-400 dark:text-gray-600" />
                        )}
                    </button>
                ))}
            </div>
        );
    };

    const handleCommentChange = (e) => {
        const text = e.target.value;
        if (text.length <= MAX_COMMENT_LENGTH) {
            setCommentText(text);
        }
    };

    const getCharacterCountClass = () => {
        const length = commentText.length;
        if (length >= MAX_COMMENT_LENGTH) return 'character-count at-limit';
        if (length >= MAX_COMMENT_LENGTH * 0.8) return 'character-count near-limit';
        return 'character-count';
    };

    if (loading) {
        return (
            <div className="comments-section p-4">
                <div className="comment-skeleton space-y-4">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3"></div>
                    <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="comments-container">
            <div className="comments-section">
                <div className="comments-header p-6">
                    <h3 className="comments-title text-xl font-semibold mb-2 text-gray-800 dark:text-white">
                        {photoId ? 'Komentarze do zdjęcia' : 'Komentarze do albumu'}
                        {averageRating > 0 && (
                            <div className="rating-display ml-3 inline-flex">
                                <FaStar className="w-4 h-4" />
                                <span>{averageRating.toFixed(1)}</span>
                            </div>
                        )}
                    </h3>
                </div>

                {auth.currentUser && (
                    <div className="comment-form p-6">
                        <form onSubmit={handleAddComment} className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Twój komentarz
                                </label>
                                <textarea
                                    value={commentText}
                                    onChange={handleCommentChange}
                                    placeholder="Dodaj komentarz..."
                                    className="comment-input w-full p-4 rounded-xl resize-none focus:outline-none"
                                    rows="3"
                                    required
                                    maxLength={MAX_COMMENT_LENGTH}
                                />
                                <div className={getCharacterCountClass()}>
                                    {commentText.length}/{MAX_COMMENT_LENGTH}
                                </div>
                            </div>
                            
                            {!hasRated && (
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Oceń
                                    </label>
                                    <StarRating
                                        value={rating}
                                        onHover={setHoverRating}
                                        onClick={setRating}
                                    />
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 
                                             text-white font-medium rounded-xl transition-all duration-200
                                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                                             dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
                                             hover:shadow-lg active:transform active:scale-95"
                                    disabled={!commentText}
                                >
                                    Opublikuj komentarz
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="comments-list">
                    {comments.map(comment => (
                        <div 
                            key={comment.id} 
                            className="comment-item p-6"
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    <div className="comment-avatar">
                                        {comment.userEmail[0].toUpperCase()}
                                    </div>
                                </div>
                                <div className="comment-content">
                                    <div className="flex items-center gap-2">
                                        <span className="comment-author">
                                            {comment.userEmail}
                                        </span>
                                        {comment.rating > 0 && (
                                            <div className="rating-display">
                                                <FaStar className="w-3 h-3" />
                                                <span>{comment.rating}</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="comment-text">
                                        {comment.content}
                                    </p>
                                    <time className="comment-timestamp">
                                        {new Date(comment.createdAt).toLocaleDateString('pl-PL', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </time>
                                </div>
                                {auth.currentUser?.uid === comment.userId && (
                                    <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="delete-button"
                                        aria-label="Usuń komentarz"
                                    >
                                        <FaTrash className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {comments.length === 0 && (
                        <div className="comments-empty">
                            <div className="comments-empty-icon">
                                <FaRegStar className="w-full h-full" />
                            </div>
                            <p className="font-medium">Brak komentarzy</p>
                            <p className="text-sm">Bądź pierwszą osobą, która skomentuje!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Comments; 