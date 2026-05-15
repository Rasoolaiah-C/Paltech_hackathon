import type { CheckIn, Exception, Habit } from '../types/habit';
import { addLocalDays, getLastLocalDateKeys, getWeekStart, parseLocalDateKey, toLocalDateKey } from './localDate';

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate30Days: number;
}

const weekdayName = (dateKey: string) =>
  parseLocalDateKey(dateKey).toLocaleDateString('en-US', { weekday: 'long' });

const isExceptionDate = (dateKey: string, exceptions: Exception[]) =>
  exceptions.some((exception) => {
    const startDate = exception.startDate ?? exception.date;
    const endDate = exception.endDate ?? exception.date;
    return dateKey >= startDate && dateKey <= endDate;
  });

export const isHabitScheduledOnDate = (habit: Habit, dateKey: string, exceptions: Exception[] = []) => {
  if (habit.startDate && dateKey < habit.startDate) {
    return false;
  }

  if (habit.endDate && dateKey > habit.endDate) {
    return false;
  }

  if (isExceptionDate(dateKey, exceptions)) {
    return false;
  }

  if (habit.scheduleType === 'Daily' || habit.scheduleType === 'WeeklyCount') {
    return true;
  }

  if (habit.scheduleType === 'Monthly') {
    return parseLocalDateKey(dateKey).getDate() === parseLocalDateKey(habit.startDate).getDate();
  }

  return habit.scheduleDays.includes(weekdayName(dateKey));
};

const doneDates = (checkIns: CheckIn[]) =>
  new Set(checkIns.filter((checkIn) => checkIn.status === 'Done').map((checkIn) => checkIn.date));

const getCompletionRate30Days = (habit: Habit, checkIns: CheckIn[], exceptions: Exception[]) => {
  const done = doneDates(checkIns);
  const last30Days = getLastLocalDateKeys(30);
  const scheduledDays = last30Days.filter((dateKey) => isHabitScheduledOnDate(habit, dateKey, exceptions));

  if (scheduledDays.length === 0) {
    return 0;
  }

  return scheduledDays.filter((dateKey) => done.has(dateKey)).length / scheduledDays.length;
};

const getDailyCurrentStreak = (habit: Habit, checkIns: CheckIn[], exceptions: Exception[]) => {
  const done = doneDates(checkIns);
  const todayKey = toLocalDateKey();
  let cursor = todayKey;
  let streak = 0;

  for (let guard = 0; guard < 730; guard += 1) {
    if (!isHabitScheduledOnDate(habit, cursor, exceptions)) {
      cursor = addLocalDays(cursor, -1);
      continue;
    }

    if (cursor === todayKey && !done.has(cursor)) {
      cursor = addLocalDays(cursor, -1);
      continue;
    }

    if (!done.has(cursor)) {
      break;
    }

    streak += 1;
    cursor = addLocalDays(cursor, -1);
  }

  return streak;
};

const getDailyLongestStreak = (habit: Habit, checkIns: CheckIn[], exceptions: Exception[]) => {
  const done = doneDates(checkIns);
  const dateKeys = Array.from(
    new Set([...checkIns.map((checkIn) => checkIn.date), ...exceptions.map((exception) => exception.date)]),
  ).sort();
  const startDate = dateKeys[0] ?? habit.startDate ?? toLocalDateKey();
  const endDate = toLocalDateKey();
  let cursor = startDate;
  let current = 0;
  let longest = 0;

  while (cursor <= endDate) {
    if (!isHabitScheduledOnDate(habit, cursor, exceptions)) {
      cursor = addLocalDays(cursor, 1);
      continue;
    }

    if (done.has(cursor)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }

    cursor = addLocalDays(cursor, 1);
  }

  return longest;
};

const weekHasTargetMet = (weekStart: string, checkIns: CheckIn[], target: number) => {
  const weekEnd = addLocalDays(weekStart, 6);
  return checkIns.filter((checkIn) => checkIn.status === 'Done' && checkIn.date >= weekStart && checkIn.date <= weekEnd)
    .length >= target;
};

const getWeeklyStreaks = (habit: Habit, checkIns: CheckIn[]) => {
  const target = Math.max(1, habit.weeklyTargetCount || 1);
  let cursor = getWeekStart(toLocalDateKey());
  let currentStreak = 0;

  for (let guard = 0; guard < 104; guard += 1) {
    if (!weekHasTargetMet(cursor, checkIns, target)) {
      break;
    }

    currentStreak += 1;
    cursor = addLocalDays(cursor, -7);
  }

  const weekStarts = Array.from(new Set(checkIns.map((checkIn) => getWeekStart(checkIn.date)))).sort();
  let current = 0;
  let longest = 0;

  weekStarts.forEach((weekStart) => {
    if (weekHasTargetMet(weekStart, checkIns, target)) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  });

  return { currentStreak, longestStreak: longest };
};

/**
 * Calculates habit metrics using local YYYY-MM-DD strings only.
 * Exceptions remove scheduled days from streak and 30-day rate denominators.
 * Weekly-count habits measure streaks by consecutive target-met weeks.
 */
export const calculateHabitStats = (
  habit: Habit,
  checkIns: CheckIn[],
  exceptions: Exception[],
): HabitStats => {
  const totalCompletions = checkIns.filter((checkIn) => checkIn.status === 'Done').length;
  const completionRate30Days = getCompletionRate30Days(habit, checkIns, exceptions);

  if (habit.scheduleType === 'WeeklyCount') {
    return {
      ...getWeeklyStreaks(habit, checkIns),
      totalCompletions,
      completionRate30Days,
    };
  }

  return {
    currentStreak: getDailyCurrentStreak(habit, checkIns, exceptions),
    longestStreak: getDailyLongestStreak(habit, checkIns, exceptions),
    totalCompletions,
    completionRate30Days,
  };
};
