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
    watermarkSettings?: {
        enabled: boolean;
        type: 'text' | 'image' | 'invisible';
        text?: string;
        fontSize?: number;
        fontColor?: string;
        opacity?: number;
        position?: 'center' | 'corners' | 'tiled';
        angle?: number;
        fontStyle?: string;
    };
    folders?: {
        original: string;
        watermarked: string;
        watermarkImage: string;
    };
    processingStatus?: {
        [fileName: string]: {
            status: 'pending' | 'processing' | 'completed' | 'error';
            attempt?: number;
            startedAt?: Timestamp;
            completedAt?: Timestamp;
            failedAt?: Timestamp;
            error?: string;
        };
    };
} 