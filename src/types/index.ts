export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'user' | 'photographer';
  createdAt: Date;
  lastLogin: Date;
}

export interface Album {
  id: string;
  name: string;
  description?: string;
  coverPhoto?: string;
  ownerId: string;
  author: {
    id: string;
    displayName: string;
  };
  isPublic: boolean;
  location?: string;
  categories: string[];
  createdAt: Date;
  updatedAt: Date;
  photos: Photo[];
}

export interface Photo {
  id: string;
  url: string;
  title?: string;
  description?: string;
  albumId?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  };
} 