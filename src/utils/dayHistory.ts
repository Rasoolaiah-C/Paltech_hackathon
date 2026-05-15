import type { HabitHistoryEntry } from '../types/habit';
import { parseLocalDateKey, toLocalDateKey } from './localDate';

export interface DayHistoryGroup {
  date: string;
  label: string;
  entries: HabitHistoryEntry[];
  summary: {
    done: number;
    missed: number;
    pending: number;
    paused: number;
    notDue: number;
  };
}

const formatDayLabel = (dateKey: string) => {
  const todayKey = toLocalDateKey();
  const yesterdayKey = parseLocalDateKey(todayKey);
  yesterdayKey.setDate(yesterdayKey.getDate() - 1);
  const yesterday = `${yesterdayKey.getFullYear()}-${String(yesterdayKey.getMonth() + 1).padStart(2, '0')}-${String(yesterdayKey.getDate()).padStart(2, '0')}`;

  if (dateKey === todayKey) {
    return 'Today';
  }

  if (dateKey === yesterday) {
    return 'Yesterday';
  }

  return parseLocalDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

const summariseDay = (entries: HabitHistoryEntry[]) => ({
  done: entries.filter((entry) => entry.status === 'Done').length,
  missed: entries.filter((entry) => entry.status === 'Missed').length,
  pending: entries.filter((entry) => entry.status === 'Pending').length,
  paused: entries.filter((entry) => entry.status === 'Paused').length,
  notDue: entries.filter((entry) => entry.status === 'Not due').length,
});

export const groupHistoryByDay = (entries: HabitHistoryEntry[]) => {
  const byDate = new Map<string, HabitHistoryEntry[]>();

  entries.forEach((entry) => {
    const dayEntries = byDate.get(entry.date) ?? [];
    dayEntries.push(entry);
    byDate.set(entry.date, dayEntries);
  });

  return Array.from(byDate.entries())
    .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
    .map(([date, dayEntries]) => ({
      date,
      label: formatDayLabel(date),
      entries: dayEntries.sort((left, right) => left.habitName.localeCompare(right.habitName)),
      summary: summariseDay(dayEntries),
    }));
};
