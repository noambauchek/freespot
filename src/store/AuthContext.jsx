// src/store/AuthContext.jsx
// Global authentication context – wraps the whole app

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange } from '../services/authService';
import { listenToUserProfile } from '../services/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null); // raw Firebase user
  const [userProfile, setUserProfile] = useState(null);   // Firestore profile
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let profileUnsub = null;

    const authUnsub = onAuthChange((fbUser) => {
      setFirebaseUser(fbUser);

      // Clean up previous profile listener
      if (profileUnsub) { profileUnsub(); profileUnsub = null; }

      if (fbUser) {
        // Subscribe to live Firestore profile
        profileUnsub = listenToUserProfile(fbUser.uid, (profile) => {
          setUserProfile(profile);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const value = {
    firebaseUser,
    userProfile,
    loading,
    isAuthenticated: !!firebaseUser,
    isAdmin: userProfile?.role === 'admin',
    uid: firebaseUser?.uid || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
