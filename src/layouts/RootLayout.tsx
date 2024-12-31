import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useAuth } from '../hooks/useAuth';

const RootLayout: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation user={user} />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default RootLayout; 