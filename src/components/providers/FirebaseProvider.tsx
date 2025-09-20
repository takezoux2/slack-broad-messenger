'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

interface FirebaseContextType {
  auth: Auth | null;
  firestore: Firestore | null;
  isInitialized: boolean;
}

const FirebaseContext = createContext<FirebaseContextType>({
  auth: null,
  firestore: null,
  isInitialized: false,
});

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseContextType>({
    auth: null,
    firestore: null,
    isInitialized: false,
  });

  useEffect(() => {
    // Initialize Firebase only on client side
    if (typeof window !== 'undefined') {
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      // Initialize Firebase if not already initialized
      let app;
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      const auth = getAuth(app);
      const firestore = getFirestore(app);

      setFirebaseServices({
        auth,
        firestore,
        isInitialized: true,
      });
    }
  }, []);

  return <FirebaseContext.Provider value={firebaseServices}>{children}</FirebaseContext.Provider>;
}
