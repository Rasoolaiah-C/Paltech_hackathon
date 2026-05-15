import type { HabitWithProgress } from '../types/habit';
import { calculateHabitStats } from './habitStats';

export const computeEligibleBadgeIds = (habits: HabitWithProgress[]) => {
  const eligible = new Set<string>();
  const totalCompletions = habits.reduce(
    (count, habit) => count + habit.checkIns.filter((checkIn) => checkIn.status === 'Done').length,
    0,
  );
  const activeHabitCount = habits.filter((habit) => habit.status === 'Active').length;
  const longestStreak = Math.max(
    0,
    ...habits.map((habit) => calculateHabitStats(habit, habit.checkIns, habit.exceptions).longestStreak),
  );

  if (totalCompletions > 0) {
    eligible.add('first-check-in');
  }

  if (longestStreak >= 7) {
    eligible.add('streak-7');
  }

  if (longestStreak >= 30) {
    eligible.add('streak-30');
  }

  if (totalCompletions >= 100) {
    eligible.add('completions-100');
  }

  if (activeHabitCount >= 5) {
    eligible.add('five-active-habits');
  }

  return eligible;
};
