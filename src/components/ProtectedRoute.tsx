import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

// Props komponentu
interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Komponent chroniący ścieżki wymagające autoryzacji
 * Przekierowuje niezalogowanych użytkowników do strony logowania
 */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  // Wyświetlanie loadera podczas sprawdzania autoryzacji
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Przekierowanie do strony logowania jeśli użytkownik nie jest zalogowany
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Renderowanie chronionej zawartości
  return <>{children}</>;
};

export default ProtectedRoute; 