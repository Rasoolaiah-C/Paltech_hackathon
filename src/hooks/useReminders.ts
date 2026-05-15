import { useCallback, useEffect, useState } from 'react';
import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { toLocalDateKey } from '../utils/localDate';
import type { Reminder } from '../types/reminder';
import { isValidReminderTime } from '../utils/validation';

const REMINDER_DOC_ID = 'default';

export function useReminder(habitId?: string, onReminderDue?: () => void) {
  const { user } = useAuth();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [loading, setLoading] = useState(Boolean(habitId));
  const [error, setError] = useState<Error | null>(null);
  const [lastAlertDate, setLastAlertDate] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !habitId) {
      return undefined;
    }

    const reminderRef = doc(db, 'habits', habitId, 'reminders', REMINDER_DOC_ID);

    const unsubscribe = onSnapshot(
      reminderRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setReminder(null);
        } else {
          setReminder({
            id: snapshot.id,
            habitId,
            ...snapshot.data(),
          } as Reminder);
        }
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

  useEffect(() => {
    if (!user || !habitId || !reminder?.enabled || !onReminderDue) {
      return undefined;
    }

    const checkReminder = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayKey = toLocalDateKey();

      if (currentTime === reminder.time && lastAlertDate !== todayKey) {
        onReminderDue();
        setLastAlertDate(todayKey);
      }
    };

    checkReminder();
    const intervalId = window.setInterval(checkReminder, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [habitId, onReminderDue, reminder?.enabled, reminder?.time, lastAlertDate, user]);

  const saveReminder = useCallback(
    async (time: string, enabled: boolean) => {
      if (!user) {
        throw new Error('You must be logged in to save a reminder.');
      }

      if (!habitId) {
        throw new Error('Habit is required to save a reminder.');
      }

      const trimmedTime = time.trim();

      if (!isValidReminderTime(trimmedTime)) {
        throw new Error('Reminder time must be a valid 24-hour HH:MM value.');
      }

      await setDoc(
        doc(db, 'habits', habitId, 'reminders', REMINDER_DOC_ID),
        {
          id: REMINDER_DOC_ID,
          habitId,
          time: trimmedTime,
          enabled,
          userId: user.uid,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
    [habitId, user],
  );

  const removeReminder = useCallback(async () => {
    if (!user) {
      throw new Error('You must be logged in to remove a reminder.');
    }

    if (!habitId) {
      throw new Error('Habit is required to remove a reminder.');
    }

    await deleteDoc(doc(db, 'habits', habitId, 'reminders', REMINDER_DOC_ID));
  }, [habitId, user]);

  return {
    error,
    loading: user && habitId ? loading : false,
    reminder: user && habitId ? reminder : null,
    removeReminder,
    saveReminder,
  };
}
