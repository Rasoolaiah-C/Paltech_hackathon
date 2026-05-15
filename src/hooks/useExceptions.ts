import { useCallback, useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import type { Exception } from '../types/habit';
import { toLocalDateKey } from '../utils/localDate';

export function useExceptions(habitId?: string) {
  const { user } = useAuth();
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(Boolean(habitId));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !habitId) {
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'habits', habitId, 'exceptions'),
      (snapshot) => {
        setExceptions(
          snapshot.docs
            .map((exceptionDoc) => ({
              id: exceptionDoc.id,
              ...exceptionDoc.data(),
            }) as Exception)
            .sort((left, right) => right.date.localeCompare(left.date)),
        );
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [habitId, user]);

  const addException = useCallback(
    async (date = toLocalDateKey(), reason?: string) => {
      if (!user) {
        throw new Error('You must be logged in to add an exception.');
      }

      if (!habitId) {
        throw new Error('Habit is required to add an exception.');
      }

      await setDoc(
        doc(db, 'habits', habitId, 'exceptions', date),
        {
          id: date,
          habitId,
          date,
          reason: reason?.trim() || '',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
    [habitId, user],
  );

  const editException = useCallback(
    async (date: string, reason?: string) => {
      await addException(date, reason);
    },
    [addException],
  );

  const removeException = useCallback(
    async (date: string) => {
      if (!user) {
        throw new Error('You must be logged in to remove an exception.');
      }

      if (!habitId) {
        throw new Error('Habit is required to remove an exception.');
      }

      await deleteDoc(doc(db, 'habits', habitId, 'exceptions', date));
    },
    [habitId, user],
  );

  return {
    addException,
    editException,
    error,
    exceptions: user && habitId ? exceptions : [],
    loading: user && habitId ? loading : false,
    removeException,
  };
}
