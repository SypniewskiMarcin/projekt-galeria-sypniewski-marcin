interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: 'user' | 'admin';
    lastLogin: string;
    updatedAt: string;
}

interface Album {
    id: string;
    name: string;
    author: {
        uid: string;
        displayName: string;
        email: string;
    };
    location: string;
    creationDate: string;
    isPublic: boolean;
    isCommercial: boolean;
    watermark: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    status: 'active' | 'archived' | 'deleted';
    photos: string[];
    permissions: {
        owner: string;
        editors: string[];
        viewers: string[];
    };
} 