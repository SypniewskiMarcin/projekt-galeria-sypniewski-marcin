import { createBrowserRouter } from 'react-router-dom';
import RootLayout from '@/layouts/RootLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Gallery from '@/pages/Gallery';
import Albums from '@/pages/Albums';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: (
          <ProtectedRoute>
            <Gallery />
          </ProtectedRoute>
        ),
      },
      {
        path: '/albums',
        element: (
          <ProtectedRoute>
            <Albums />
          </ProtectedRoute>
        ),
      },
      {
        path: '/profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]); 