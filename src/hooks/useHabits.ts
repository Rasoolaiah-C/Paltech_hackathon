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

const today = () => new Date().toISOString().slice(0, 10);

const toDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const withoutUndefined = (input: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));

const normaliseHabitInput = (input: CreateHabitInput | UpdateHabitInput) =>
  withoutUndefined({
    ...input,
    name: input.name?.trim(),
    description: input.description?.trim(),
    category: input.category?.trim(),
    unitLabel: input.unitLabel?.trim(),
    scheduleDays:
      input.scheduleType === undefined
        ? input.scheduleDays
        : input.scheduleType === 'SpecificWeekdays'
          ? (input.scheduleDays ?? [])
          : [],
    weeklyTargetCount:
      input.scheduleType === undefined
        ? input.weeklyTargetCount
        : input.scheduleType === 'WeeklyCount'
          ? (input.weeklyTargetCount ?? 1)
          : 1,
    endDate: input.endDate?.trim(),
  });

const isPausedOnDate = (exceptions: Exception[], date: string) =>
  exceptions.some((exception) => {
    const startDate = exception.startDate ?? exception.date;
    const endDate = exception.endDate ?? exception.date;
    return date >= startDate && date <= endDate;
  });

const isExpectedOnDate = (habit: Habit, date: string, exceptions: Exception[] = []) => {
  if (habit.startDate && date < habit.startDate) {
    return false;
  }

  if (habit.endDate && date > habit.endDate) {
    return false;
  }

  if (isPausedOnDate(exceptions, date)) {
    return false;
  }

  if (habit.scheduleType === 'Daily' || habit.scheduleType === 'WeeklyCount') {
    return true;
  }

  if (habit.scheduleType === 'Monthly') {
    return toDate(date).getDate() === toDate(habit.startDate).getDate();
  }

  const weekday = toDate(date).toLocaleDateString('en-US', { weekday: 'long' });
  return habit.scheduleDays.includes(weekday);
};

const isComplete = (checkIn?: CheckIn) => checkIn?.status === 'Done';

const calculateCurrentStreak = (habit: Habit, checkIns: CheckIn[], exceptions: Exception[]) => {
  const checkInsByDate = new Map(checkIns.map((checkIn) => [checkIn.date, checkIn]));
  let streak = 0;
  let cursor = toDate(today());
  const todayKey = today();

  for (let index = 0; index < 366; index += 1) {
    const dateKey = toDateKey(cursor);

    if (!isExpectedOnDate(habit, dateKey, exceptions)) {
      cursor = addDays(cursor, -1);
      continue;
    }

    if (dateKey === todayKey && !isComplete(checkInsByDate.get(dateKey))) {
      cursor = addDays(cursor, -1);
      continue;
    }

    if (!isComplete(checkInsByDate.get(dateKey))) {
      break;
    }

    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
};

const buildHistory = (
  habits: Habit[],
  checkInsByHabitId: Record<string, CheckIn[]>,
  exceptionsByHabitId: Record<string, Exception[]>,
) => {
  const todayKey = today();
  const entries: HabitHistoryEntry[] = [];

  habits.forEach((habit) => {
    const checkIns = checkInsByHabitId[habit.id] ?? [];
    const exceptions = exceptionsByHabitId[habit.id] ?? [];
    const checkInsByDate = new Map(checkIns.map((checkIn) => [checkIn.date, checkIn]));

    for (let index = 0; index < 30; index += 1) {
      const date = toDateKey(addDays(toDate(todayKey), -index));
      const checkIn = checkInsByDate.get(date);
      const pause = exceptions.find((exception) => {
        const startDate = exception.startDate ?? exception.date;
        const endDate = exception.endDate ?? exception.date;
        return date >= startDate && date <= endDate;
      });
      const expected = isExpectedOnDate(habit, date, exceptions);

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

      await addDoc(collection(db, 'habits'), {
        ...normaliseHabitInput(input),
        scheduleDays: input.scheduleType === 'SpecificWeekdays' ? input.scheduleDays : [],
        weeklyTargetCount: input.scheduleType === 'WeeklyCount' ? input.weeklyTargetCount : 1,
        endDate: input.endDate.trim(),
        status: input.status ?? 'Active',
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
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
  const todayKey = today();
  const habitsWithProgress = userHabits.map((habit) => {
    const habitCheckIns = visibleCheckInsByHabitId[habit.id] ?? [];
    const habitExceptions = visibleExceptionsByHabitId[habit.id] ?? [];
    const todayCheckIn = habitCheckIns.find((checkIn) => checkIn.date === todayKey);

    return {
      ...habit,
      checkIns: habitCheckIns,
      exceptions: habitExceptions,
      currentStreak: calculateCurrentStreak(habit, habitCheckIns, habitExceptions),
      isExpectedToday: isExpectedOnDate(habit, todayKey, habitExceptions),
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
