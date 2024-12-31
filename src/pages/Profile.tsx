import React from 'react';
import { useAuth } from '../hooks/useAuth';

const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-6 mb-4">
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="h-24 w-24 rounded-full"
            />
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {user.displayName}
            </h2>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-sm text-gray-500 mt-1">
              Rola: {user.role}
            </p>
          </div>
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-2">Informacje o koncie</h3>
          <p className="text-gray-600">
            Data utworzenia: {user.createdAt.toLocaleDateString()}
          </p>
          <p className="text-gray-600">
            Ostatnie logowanie: {user.lastLogin.toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile; 