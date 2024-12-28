import { useState, useEffect } from 'react';
import { auth } from '@/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';

/**
 * Hook zarządzający stanem autoryzacji użytkownika
 * @returns {Object} Obiekt zawierający informacje o użytkowniku i stanie ładowania
 */
export const useAuth = () => {
  // Stan przechowujący dane użytkownika
  const [user, setUser] = useState<User | null>(null);
  // Stan określający czy trwa ładowanie danych
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Nasłuchiwanie na zmiany stanu autoryzacji
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Czyszczenie nasłuchiwania przy odmontowaniu komponentu
    return () => unsubscribe();
  }, []);

  return { user, loading };
}; 