import { useCallback, useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import type {
  CheckIn,
  CheckInInput,
  CreateHabitInput,
  Exception,
  Habit,
  HabitHistoryEntry,
  HabitStatus,
  UpdateHabitInput,
} from '../types/habit';
import { calculateHabitStats, isHabitScheduledOnDate } from '../utils/habitStats';
import { addLocalDays, isOlderThanDays, toLocalDateKey } from '../utils/localDate';

const withoutUndefined = (input: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));

const REMINDER_DOC_ID = 'default';

const normaliseHabitInput = (input: CreateHabitInput | UpdateHabitInput) => {
  const { reminderEnabled, reminderTime, ...safeInput } = input;

  return withoutUndefined({
    ...safeInput,
    name: safeInput.name?.trim(),
    description: safeInput.description?.trim(),
    category: safeInput.category?.trim(),
    unitLabel: safeInput.unitLabel?.trim(),
    scheduleDays:
      safeInput.scheduleType === undefined
        ? safeInput.scheduleDays
        : safeInput.scheduleType === 'SpecificWeekdays'
          ? (safeInput.scheduleDays ?? [])
          : [],
    weeklyTargetCount:
      safeInput.scheduleType === undefined
        ? safeInput.weeklyTargetCount
        : safeInput.scheduleType === 'WeeklyCount'
          ? (safeInput.weeklyTargetCount ?? 1)
          : 1,
    endDate: safeInput.endDate?.trim(),
  });
};

const isComplete = (checkIn?: CheckIn) => checkIn?.status === 'Done';

const buildHistory = (
  habits: Habit[],
  checkInsByHabitId: Record<string, CheckIn[]>,
  exceptionsByHabitId: Record<string, Exception[]>,
) => {
  const todayKey = toLocalDateKey();
  const entries: HabitHistoryEntry[] = [];

  habits.forEach((habit) => {
    const checkIns = checkInsByHabitId[habit.id] ?? [];
    const exceptions = exceptionsByHabitId[habit.id] ?? [];
    const checkInsByDate = new Map(checkIns.map((checkIn) => [checkIn.date, checkIn]));

    for (let index = 0; index < 30; index += 1) {
      const date = addLocalDays(todayKey, -index);
      const checkIn = checkInsByDate.get(date);
      const pause = exceptions.find((exception) => {
        const startDate = exception.startDate ?? exception.date;
        const endDate = exception.endDate ?? exception.date;
        return date >= startDate && date <= endDate;
      });
      const expected = isHabitScheduledOnDate(habit, date, exceptions);

      entries.push({
        date,
        habitId: habit.id,
        habitName: habit.name,
        expected,
        status: checkIn?.status === 'Done'
          ? 'Done'
          : pause
            ? 'Paused'
            : expected
              ? date === todayKey
                ? 'Pending'
                : 'Missed'
              : 'Not due',
        value: checkIn?.value ?? 0,
        reason: pause?.reason ?? '',
      });
    }
  });

  return entries.sort((leftEntry, rightEntry) => rightEntry.date.localeCompare(leftEntry.date));
};

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkInsByHabitId, setCheckInsByHabitId] = useState<Record<string, CheckIn[]>>({});
  const [exceptionsByHabitId, setExceptionsByHabitId] = useState<Record<string, Exception[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const habitsQuery = query(collection(db, 'habits'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      habitsQuery,
      (snapshot) => {
        const nextHabits = snapshot.docs
          .map((habitDoc) => ({
            id: habitDoc.id,
            ...habitDoc.data(),
          }) as Habit)
          .sort((leftHabit, rightHabit) => leftHabit.name.localeCompare(rightHabit.name));

        setHabits(nextHabits);
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user || habits.length === 0) {
      return undefined;
    }

    const unsubscribes = habits.map((habit) =>
      onSnapshot(
        collection(db, 'habits', habit.id, 'checkIns'),
        (snapshot) => {
          const checkIns = snapshot.docs
            .map((checkInDoc) => ({
              id: checkInDoc.id,
              ...checkInDoc.data(),
            }) as CheckIn)
            .sort((leftCheckIn, rightCheckIn) => rightCheckIn.date.localeCompare(leftCheckIn.date));

          setCheckInsByHabitId((currentCheckIns) => ({
            ...currentCheckIns,
            [habit.id]: checkIns,
          }));
        },
        (snapshotError) => setError(snapshotError),
      ),
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [habits, user]);

  useEffect(() => {
    if (!user || habits.length === 0) {
      return undefined;
    }

    const unsubscribes = habits.map((habit) =>
      onSnapshot(
        collection(db, 'habits', habit.id, 'exceptions'),
        (snapshot) => {
          const exceptions = snapshot.docs
            .map((exceptionDoc) => ({
              id: exceptionDoc.id,
              ...exceptionDoc.data(),
            }) as Exception)
            .sort((leftException, rightException) =>
              (rightException.startDate ?? rightException.date).localeCompare(
                leftException.startDate ?? leftException.date,
              ),
            );

          setExceptionsByHabitId((currentExceptions) => ({
            ...currentExceptions,
            [habit.id]: exceptions,
          }));
        },
        (snapshotError) => setError(snapshotError),
      ),
    );

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [habits, user]);

  const createHabit = useCallback(
    async (input: CreateHabitInput) => {
      if (!user) {
        throw new Error('You must be logged in to create a habit.');
      }

      if (!input.name.trim()) {
        throw new Error('Habit name is required.');
      }

      if (input.targetValue <= 0) {
        throw new Error('Target value must be greater than 0.');
      }

      const habitRef = await addDoc(collection(db, 'habits'), {
        ...normaliseHabitInput(input),
        scheduleDays: input.scheduleType === 'SpecificWeekdays' ? input.scheduleDays : [],
        weeklyTargetCount: input.scheduleType === 'WeeklyCount' ? input.weeklyTargetCount : 1,
        endDate: input.endDate.trim(),
        status: input.status ?? 'Active',
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (input.reminderEnabled && input.reminderTime?.trim()) {
        await setDoc(
          doc(db, 'habits', habitRef.id, 'reminders', REMINDER_DOC_ID),
          {
            id: REMINDER_DOC_ID,
            habitId: habitRef.id,
            time: input.reminderTime.trim(),
            enabled: true,
            userId: user.uid,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
    },
    [user],
  );

  const updateHabit = useCallback(
    async (habitId: string, input: UpdateHabitInput) => {
      if (!user) {
        throw new Error('You must be logged in to edit a habit.');
      }

      const habit = habits.find((currentHabit) => currentHabit.id === habitId);

      if (!habit || habit.userId !== user.uid) {
        throw new Error('Habit not found for the current user.');
      }

      if (input.name !== undefined && !input.name.trim()) {
        throw new Error('Habit name is required.');
      }

      if (input.targetValue !== undefined && input.targetValue <= 0) {
        throw new Error('Target value must be greater than 0.');
      }

      await updateDoc(doc(db, 'habits', habitId), {
        ...normaliseHabitInput(input),
        updatedAt: serverTimestamp(),
      });
    },
    [habits, user],
  );

  const updateHabitStatus = useCallback(
    async (habitId: string, status: HabitStatus) => {
      await updateHabit(habitId, { status });
    },
    [updateHabit],
  );

  const recordCheckIn = useCallback(
    async (input: CheckInInput) => {
      if (!user) {
        throw new Error('You must be logged in to record a check-in.');
      }

      const habit = habits.find((currentHabit) => currentHabit.id === input.habitId);

      if (!habit || habit.userId !== user.uid) {
        throw new Error('Habit not found for the current user.');
      }

      const todayKey = toLocalDateKey();

      if (input.date > todayKey) {
        throw new Error('Check-ins cannot be recorded for future dates.');
      }

      if (isOlderThanDays(input.date, 7)) {
        throw new Error('Check-ins can only be backdated up to 7 days.');
      }

      const checkInRef = doc(db, 'habits', input.habitId, 'checkIns', input.date);

      await setDoc(
        checkInRef,
        {
          ...input,
          id: input.date,
          note: input.note?.trim() ?? '',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
    [habits, user],
  );

  const pauseHabit = useCallback(
    async (habitId: string, startDate: string, endDate: string, reason: string) => {
      if (!user) {
        throw new Error('You must be logged in to pause tracking.');
      }

      const habit = habits.find((currentHabit) => currentHabit.id === habitId);

      if (!habit || habit.userId !== user.uid) {
        throw new Error('Habit not found for the current user.');
      }

      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required.');
      }

      if (endDate < startDate) {
        throw new Error('Pause end date must be after the start date.');
      }

      const exceptionRef = doc(db, 'habits', habitId, 'exceptions', `${startDate}_${endDate}`);

      await setDoc(
        exceptionRef,
        {
          id: exceptionRef.id,
          habitId,
          date: startDate,
          startDate,
          endDate,
          reason: reason.trim(),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );
    },
    [habits, user],
  );

  const deleteHabit = useCallback(
    async (habitId: string) => {
      if (!user) {
        throw new Error('You must be logged in to delete a habit.');
      }

      const habit = habits.find((currentHabit) => currentHabit.id === habitId);

      if (!habit || habit.userId !== user.uid) {
        throw new Error('Habit not found for the current user.');
      }

      const batch = writeBatch(db);
      const subcollections = ['checkIns', 'exceptions', 'reminders'];

      await Promise.all(
        subcollections.map(async (subcollection) => {
          const snapshot = await getDocs(collection(db, 'habits', habitId, subcollection));
          snapshot.docs.forEach((subDoc) => batch.delete(subDoc.ref));
        }),
      );

      batch.delete(doc(db, 'habits', habitId));
      await batch.commit();
      setCheckInsByHabitId((currentCheckIns) => {
        const nextCheckIns = { ...currentCheckIns };
        delete nextCheckIns[habitId];
        return nextCheckIns;
      });
    },
    [habits, user],
  );

  const userHabits = user ? habits : [];
  const visibleHabitIds = new Set(userHabits.map((habit) => habit.id));
  const visibleCheckInsByHabitId = Object.fromEntries(
    Object.entries(checkInsByHabitId).filter(([habitId]) => visibleHabitIds.has(habitId)),
  );
  const visibleExceptionsByHabitId = Object.fromEntries(
    Object.entries(exceptionsByHabitId).filter(([habitId]) => visibleHabitIds.has(habitId)),
  );
  const todayKey = toLocalDateKey();
  const habitsWithProgress = userHabits.map((habit) => {
    const habitCheckIns = visibleCheckInsByHabitId[habit.id] ?? [];
    const habitExceptions = visibleExceptionsByHabitId[habit.id] ?? [];
    const todayCheckIn = habitCheckIns.find((checkIn) => checkIn.date === todayKey);
    const stats = calculateHabitStats(habit, habitCheckIns, habitExceptions);

    return {
      ...habit,
      checkIns: habitCheckIns,
      exceptions: habitExceptions,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      isExpectedToday: isHabitScheduledOnDate(habit, todayKey, habitExceptions),
      isTodayDone: isComplete(todayCheckIn),
      todayCheckIn,
    };
  });

  return {
    habits: habitsWithProgress,
    activeHabits: habitsWithProgress.filter((habit) => habit.status === 'Active'),
    loading: user ? loading : false,
    error,
    createHabit,
    updateHabit,
    updateHabitStatus,
    deleteHabit,
    history: buildHistory(userHabits, visibleCheckInsByHabitId, visibleExceptionsByHabitId),
    pauseHabit,
    recordCheckIn,
  };
}
