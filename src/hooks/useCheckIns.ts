import { useCallback, useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import type { CheckIn, CheckInInput, CheckInStatus } from '../types/habit';
import { isOlderThanDays, toLocalDateKey } from '../utils/localDate';

interface UpsertCheckInInput {
  date?: string;
  status: CheckInStatus;
  value?: number;
  note?: string;
}

export function useCheckIns(habitId?: string) {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(Boolean(habitId));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !habitId) {
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'habits', habitId, 'checkIns'),
      (snapshot) => {
        setCheckIns(
          snapshot.docs
            .map((checkInDoc) => ({
              id: checkInDoc.id,
              ...checkInDoc.data(),
            }) as CheckIn)
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

  const upsertCheckIn = useCallback(
    async (input: UpsertCheckInInput) => {
      if (!user) {
        throw new Error('You must be logged in to record a check-in.');
      }

      if (!habitId) {
        throw new Error('Habit is required to record a check-in.');
      }

      const date = input.date ?? toLocalDateKey();
      const todayKey = toLocalDateKey();

      if (date > todayKey) {
        throw new Error('Check-ins cannot be recorded for future dates.');
      }

      if (isOlderThanDays(date, 7)) {
        throw new Error('Check-ins can only be backdated up to 7 days.');
      }

      if (input.value !== undefined && input.value < 0) {
        throw new Error('Check-in value cannot be negative.');
      }

      const checkIn: CheckInInput = {
        habitId,
        date,
        status: input.status,
        value: input.value,
        note: input.note?.trim(),
      };

      await setDoc(
        doc(db, 'habits', habitId, 'checkIns', date),
        {
          ...checkIn,
          id: date,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
    [habitId, user],
  );

  const deleteCheckIn = useCallback(
    async (date: string) => {
      if (!user) {
        throw new Error('You must be logged in to remove a check-in.');
      }

      if (!habitId) {
        throw new Error('Habit is required to remove a check-in.');
      }

      await deleteDoc(doc(db, 'habits', habitId, 'checkIns', date));
    },
    [habitId, user],
  );

  return {
    checkIns: user && habitId ? checkIns : [],
    deleteCheckIn,
    error,
    loading: user && habitId ? loading : false,
    upsertCheckIn,
  };
}
