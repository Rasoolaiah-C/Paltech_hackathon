import type { Habit } from '../types/habit';

interface HabitStreaksProps {
  currentStreak: number;
  longestStreak: number;
  scheduleType: Habit['scheduleType'];
  compact?: boolean;
}

const unitLabel = (scheduleType: Habit['scheduleType'], count: number) => {
  if (scheduleType === 'WeeklyCount') {
    return count === 1 ? 'week' : 'weeks';
  }

  if (scheduleType === 'Monthly') {
    return count === 1 ? 'month' : 'months';
  }

  return count === 1 ? 'streak' : 'streaks';
};

export default function HabitStreaks({
  compact = false,
  currentStreak,
  longestStreak,
  scheduleType,
}: HabitStreaksProps) {
  const unit = unitLabel(scheduleType, currentStreak);
  const bestUnit = unitLabel(scheduleType, longestStreak);

  if (compact) {
    return (
      <span className="habit-streaks habit-streaks--compact">
        <span className="habit-streaks__current" title="Current streak">
          {currentStreak} {unit}
        </span>
        <span className="habit-streaks__sep" aria-hidden="true">
          ·
        </span>
        <span className="habit-streaks__best" title="Longest streak">
          {longestStreak} {bestUnit} best
        </span>
      </span>
    );
  }

  return (
    <div className="habit-streaks" aria-label="Streak progress">
      <span className="habit-streaks__pill habit-streaks__pill--current">
        <strong>{currentStreak}</strong>
        <span>current {unit}</span>
      </span>
      <span className="habit-streaks__pill habit-streaks__pill--best">
        <strong>{longestStreak}</strong>
        <span>best {bestUnit}</span>
      </span>
    </div>
  );
}
