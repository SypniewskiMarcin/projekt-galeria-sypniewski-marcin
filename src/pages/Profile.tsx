import { useAuth } from '@/hooks/useAuth';

const Profile = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center space-x-6">
          <img
            src={user.photoURL || ''}
            alt={user.displayName || 'Użytkownik'}
            className="w-24 h-24 rounded-full"
          />
          <div>
            <h1 className="text-2xl font-bold">{user.displayName}</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Informacje o koncie</h2>
          <div className="space-y-4">
            <div>
              <p className="text-gray-600">Data utworzenia konta:</p>
              <p>{user.metadata.creationTime}</p>
            </div>
            <div>
              <p className="text-gray-600">Ostatnie logowanie:</p>
              <p>{user.metadata.lastSignInTime}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 