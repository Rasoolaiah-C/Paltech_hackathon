import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HabitStreaks from './HabitStreaks';
import type { CheckInStatus, HabitWithProgress } from '../types/habit';
import { toLocalDateKey } from '../utils/localDate';

interface HabitListProps {
  emptyMessage: string;
  habits: HabitWithProgress[];
  onDeleteHabit: (habitId: string) => Promise<void>;
  onEditHabit: (habit: HabitWithProgress) => void;
  onPauseHabit: (habitId: string, startDate: string, endDate: string, reason: string) => Promise<void>;
  onUpdateStatus?: (habitId: string, status: HabitWithProgress['status']) => Promise<void>;
  onRecordCheckIn: (habitId: string, status: CheckInStatus, value: number, note: string) => Promise<void>;
  title: string;
}

const today = () => toLocalDateKey();

const scheduleLabel = (habit: HabitWithProgress) => {
  if (habit.status === 'Paused') {
    return 'Paused';
  }

  if (habit.scheduleType === 'Daily') {
    return 'Daily';
  }

  if (habit.scheduleType === 'WeeklyCount') {
    return 'Weekly';
  }

  if (habit.scheduleType === 'Monthly') {
    return 'Monthly';
  }

  return 'Specific weekdays';
};

const scheduleSummary = (habit: HabitWithProgress) => {
  if (habit.scheduleType === 'WeeklyCount') {
    return `${habit.weeklyTargetCount} per week`;
  }

  if (habit.scheduleType === 'SpecificWeekdays') {
    return habit.scheduleDays.map((day) => day.slice(0, 3)).join(', ');
  }

  if (habit.scheduleType === 'Monthly') {
    return `Monthly on day ${new Date(`${habit.startDate}T00:00:00`).getDate()}`;
  }

  return 'Every day';
};

const isTimeUnit = (unitLabel: string) => {
  const normalisedUnit = unitLabel.trim().toLowerCase();
  return ['minute', 'minutes', 'min', 'mins', 'hour', 'hours', 'hr', 'hrs'].includes(normalisedUnit);
};

const valueStep = (unitLabel: string) => {
  const normalisedUnit = unitLabel.trim().toLowerCase();
  return ['hour', 'hours', 'hr', 'hrs'].includes(normalisedUnit) ? 0.25 : 1;
};

export default function HabitList({
  emptyMessage,
  habits,
  onDeleteHabit,
  onEditHabit,
  onPauseHabit,
  onRecordCheckIn,
  onUpdateStatus,
  title,
}: HabitListProps) {
  const navigate = useNavigate();
  const [savingHabitId, setSavingHabitId] = useState<string | null>(null);
  const [pauseHabitId, setPauseHabitId] = useState<string | null>(null);
  const [pauseStartDate, setPauseStartDate] = useState(today());
  const [pauseEndDate, setPauseEndDate] = useState(today());
  const [pauseReason, setPauseReason] = useState('');
  const [values, setValues] = useState<Record<string, number>>({});
  const [error, setError] = useState('');
  const groupedHabits = useMemo(
    () =>
      habits.reduce<Record<string, HabitWithProgress[]>>((groups, habit) => {
        const groupName = scheduleLabel(habit);
        return {
          ...groups,
          [groupName]: [...(groups[groupName] ?? []), habit],
        };
      }, {}),
    [habits],
  );

  const handleAction = async (habitId: string, action: () => Promise<void>) => {
    setError('');
    setSavingHabitId(habitId);

    try {
      await action();
    } catch (actionError) {
      setError((actionError as Error).message);
    } finally {
      setSavingHabitId(null);
    }
  };

  const handleCheckIn = async (habit: HabitWithProgress, status: CheckInStatus) => {
    await handleAction(habit.id, async () => {
      await onRecordCheckIn(
        habit.id,
        status,
        values[habit.id] ?? (status === 'Skipped' ? 0 : habit.targetValue),
        '',
      );
    });
  };

  const handlePause = async (habitId: string) => {
    await handleAction(habitId, async () => {
      await onPauseHabit(habitId, pauseStartDate, pauseEndDate, pauseReason);
      setPauseHabitId(null);
      setPauseReason('');
      setPauseStartDate(today());
      setPauseEndDate(today());
    });
  };

  const handleDelete = async (habit: HabitWithProgress) => {
    const confirmed = window.confirm(`Delete "${habit.name}" and all of its history?`);

    if (!confirmed) {
      return;
    }

    await handleAction(habit.id, () => onDeleteHabit(habit.id));
  };

  if (habits.length === 0) {
    return (
      <section className="empty-state" aria-label="Empty dashboard">
        <h3>No habits to show</h3>
        <p>{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="habit-list" aria-label="Active habits">
      <div>
        <p className="eyebrow">Habits</p>
        <h3>{title}</h3>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="habit-groups">
        {Object.entries(groupedHabits).map(([groupName, groupHabits]) => (
          <section className="habit-group" key={groupName}>
            <h4>{groupName}</h4>
            <div className="habit-list__items">
              {groupHabits.map((habit) => (
                <article
                  className={
                    habit.status === 'Archived'
                      ? 'habit-card habit-card--minimal habit-card--archived'
                      : 'habit-card habit-card--minimal'
                  }
                  key={habit.id}
                >
                  <div className="habit-card__content">
                    <div>
                      <h4>{habit.name}</h4>
                      <p>{scheduleSummary(habit)}</p>
                    </div>
                    <span
                      className={
                        habit.isTodayDone
                          ? 'today-pill today-pill--done'
                          : habit.isExpectedToday
                            ? 'today-pill today-pill--due'
                            : 'today-pill'
                      }
                    >
                      {habit.isTodayDone ? 'Completed today' : habit.isExpectedToday ? 'Not completed' : 'Not due'}
                    </span>
                  </div>

                  <div className="habit-card__summary">
                    <HabitStreaks
                      compact
                      currentStreak={habit.currentStreak}
                      longestStreak={habit.longestStreak}
                      scheduleType={habit.scheduleType}
                    />
                    {habit.category && <span>{habit.category}</span>}
                    {habit.exceptions.some((exception) => {
                      const startDate = exception.startDate ?? exception.date;
                      const endDate = exception.endDate ?? exception.date;
                      return today() >= startDate && today() <= endDate;
                    }) && <span>Paused today</span>}
                  </div>

                  {habit.targetType === 'Count' && habit.status === 'Active' && (
                    <label className="habit-value-field">
                      <span>{isTimeUnit(habit.unitLabel) ? `Time in ${habit.unitLabel}` : `Value in ${habit.unitLabel}`}</span>
                      <input
                        aria-label={`Value for ${habit.name}`}
                        className="habit-value-input"
                        min="0"
                        onChange={(event) =>
                          setValues((currentValues) => ({
                            ...currentValues,
                            [habit.id]: Number(event.target.value),
                          }))
                        }
                        step={valueStep(habit.unitLabel)}
                        type="number"
                        value={values[habit.id] ?? habit.targetValue}
                      />
                    </label>
                  )}

                  <div className="habit-card__actions">
                    {habit.status !== 'Archived' && (
                      <button
                        className="button"
                        disabled={savingHabitId === habit.id || !habit.isExpectedToday || habit.isTodayDone}
                        onClick={() => handleCheckIn(habit, 'Done')}
                        type="button"
                      >
                        {habit.isTodayDone ? 'Done Today' : 'Mark Done'}
                      </button>
                    )}
                    <Link className="button button--ghost" to={`/habits/${habit.id}`}>
                      Open
                    </Link>
                    <button className="button button--ghost" onClick={() => navigate(`/habits/${habit.id}?section=reminder`)} type="button">
                      Reminder
                    </button>
                    <button className="button button--ghost" onClick={() => onEditHabit(habit)} type="button">
                      Edit
                    </button>
                    {onUpdateStatus && habit.status === 'Active' && (
                      <button
                        className="button button--ghost"
                        disabled={savingHabitId === habit.id}
                        onClick={() => handleAction(habit.id, () => onUpdateStatus(habit.id, 'Paused'))}
                        type="button"
                      >
                        Pause
                      </button>
                    )}
                    {onUpdateStatus && habit.status === 'Paused' && (
                      <button
                        className="button"
                        disabled={savingHabitId === habit.id}
                        onClick={() => handleAction(habit.id, () => onUpdateStatus(habit.id, 'Active'))}
                        type="button"
                      >
                        Resume
                      </button>
                    )}
                    {onUpdateStatus && habit.status !== 'Archived' && (
                      <button
                        className="button button--ghost"
                        disabled={savingHabitId === habit.id}
                        onClick={() => handleAction(habit.id, () => onUpdateStatus(habit.id, 'Archived'))}
                        type="button"
                      >
                        Archive
                      </button>
                    )}
                    {onUpdateStatus && habit.status === 'Archived' && (
                      <button
                        className="button"
                        disabled={savingHabitId === habit.id}
                        onClick={() => handleAction(habit.id, () => onUpdateStatus(habit.id, 'Active'))}
                        type="button"
                      >
                        Unarchive
                      </button>
                    )}
                    {habit.status !== 'Archived' && (
                      <button
                        className="button button--ghost"
                        disabled={savingHabitId === habit.id}
                        onClick={() => setPauseHabitId(pauseHabitId === habit.id ? null : habit.id)}
                        type="button"
                      >
                        Pause Dates
                      </button>
                    )}
                    <button
                      className="button button--danger"
                      disabled={savingHabitId === habit.id}
                      onClick={() => handleDelete(habit)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>

                  {pauseHabitId === habit.id && (
                    <div className="pause-form">
                      <label>
                        Start
                        <input
                          onChange={(event) => setPauseStartDate(event.target.value)}
                          type="date"
                          value={pauseStartDate}
                        />
                      </label>
                      <label>
                        End
                        <input
                          onChange={(event) => setPauseEndDate(event.target.value)}
                          type="date"
                          value={pauseEndDate}
                        />
                      </label>
                      <label>
                        Reason
                        <input
                          onChange={(event) => setPauseReason(event.target.value)}
                          placeholder="Optional"
                          value={pauseReason}
                        />
                      </label>
                      <button
                        className="button button--secondary"
                        disabled={savingHabitId === habit.id}
                        onClick={() => handlePause(habit.id)}
                        type="button"
                      >
                        Save Pause
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
