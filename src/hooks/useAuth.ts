import { useState, useEffect } from 'react';
import { auth, db } from '@/firebaseConfig';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { User } from '@/types';

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Czyszczenie nasłuchiwania przy odmontowaniu komponentu
    return () => unsubscribe();
  }, []);

  return { user, loading };
}; 