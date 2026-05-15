import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Create user document in Firestore
    await setDoc(doc(db, 'users', userId), {
      userId,
      email,
      createdAt: serverTimestamp(),
    });
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const updateUsername = useCallback(async (username: string) => {
    if (!auth.currentUser) {
      throw new Error('No authenticated user.');
    }

    await updateProfile(auth.currentUser, {
      displayName: username,
    });

    await setDoc(
      doc(db, 'users', auth.currentUser.uid),
      {
        username,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    if (!auth.currentUser) {
      throw new Error('No authenticated user.');
    }

    await updatePassword(auth.currentUser, newPassword);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      updateUsername,
      updatePassword: changePassword,
    }),
    [user, loading, login, register, logout],
  );

  return createElement(AuthContext.Provider, { value }, children);
}
