import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HabitStreaks from './HabitStreaks';
import { useReminder } from '../hooks/useReminders';
import type { CheckInStatus, HabitWithProgress } from '../types/habit';

interface DueTodayPanelProps {
  habits: HabitWithProgress[];
  onRecordCheckIn: (habitId: string, status: CheckInStatus, value: number, note: string) => Promise<void>;
}

const isHourUnit = (unitLabel: string) =>
  ['hour', 'hours', 'hr', 'hrs'].includes(unitLabel.trim().toLowerCase());

interface DueTodayCardProps {
  habit: HabitWithProgress;
  value: number;
  savingHabitId: string | null;
  onMarkDone: (habit: HabitWithProgress, value: number) => Promise<void>;
  onChangeValue: (habitId: string, nextValue: number) => void;
}

function DueTodayCard({ habit, value, savingHabitId, onMarkDone, onChangeValue }: DueTodayCardProps) {
  const { reminder } = useReminder(habit.id, () => {
    window.alert(`Reminder: ${habit.name} is scheduled now. Complete your task.`);
  });
  const navigate = useNavigate();
  const reminderLabel = reminder?.enabled ? `Reminder: ${reminder.time}` : null;

  const openHabitDetail = () => navigate(`/habits/${habit.id}?section=reminder`);

  return (
    <article className="due-card" key={habit.id} onClick={openHabitDetail}>
      <div>
        <h3>{habit.name}</h3>
        <p className="due-card__meta">
          <HabitStreaks
            compact
            currentStreak={habit.currentStreak}
            longestStreak={habit.longestStreak}
            scheduleType={habit.scheduleType}
          />
          {habit.category && <span>{habit.category}</span>}
        </p>
        {reminderLabel && <p className="due-card__reminder">{reminderLabel}</p>}
      </div>

      {habit.targetType === 'Yes/No' ? (
        <button
          className="check-toggle"
          disabled={savingHabitId === habit.id}
          onClick={(event) => {
            event.stopPropagation();
            onMarkDone(habit, 1);
          }}
          type="button"
          aria-label={`Mark ${habit.name} done for today`}
        >
          ✓
        </button>
      ) : (
        <div className="quick-count">
          <label>
            <span>
              {habit.unitLabel}
              {isHourUnit(habit.unitLabel) ? ' tracked in 15 minute steps' : ''}
            </span>
            <input
              min="0"
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => onChangeValue(habit.id, Number(event.target.value))}
              step={isHourUnit(habit.unitLabel) ? 0.25 : 1}
              type="number"
              value={value}
            />
          </label>
          <button
            className="button"
            disabled={savingHabitId === habit.id}
            onClick={(event) => {
              event.stopPropagation();
              onMarkDone(habit, value);
            }}
            type="button"
            aria-label={`Submit ${habit.name} count for today`}
          >
            +
          </button>
        </div>
      )}

      <button
        className="button button--ghost"
        onClick={(event) => {
          event.stopPropagation();
          openHabitDetail();
        }}
        type="button"
      >
        Reminder
      </button>
    </article>
  );
}

export default function DueTodayPanel({ habits, onRecordCheckIn }: DueTodayPanelProps) {
  const [countValues, setCountValues] = useState<Record<string, number>>({});
  const [optimisticDone, setOptimisticDone] = useState<Set<string>>(new Set());
  const [savingHabitId, setSavingHabitId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const dueTodayHabits = useMemo(
    () =>
      habits.filter(
        (habit) =>
          habit.status === 'Active' &&
          habit.isExpectedToday &&
          !habit.isTodayDone &&
          !optimisticDone.has(habit.id),
      ),
    [habits, optimisticDone],
  );

  const markDone = async (habit: HabitWithProgress, value: number) => {
    if (habit.targetType === 'Count' && value <= 0) {
      setToast('Enter a positive value before submitting.');
      return;
    }

    setToast('');
    setSavingHabitId(habit.id);
    setOptimisticDone((current) => new Set(current).add(habit.id));

    try {
      await onRecordCheckIn(habit.id, 'Done', value, '');
      setToast(`${habit.name} completed.`);
    } catch (error) {
      setOptimisticDone((current) => {
        const next = new Set(current);
        next.delete(habit.id);
        return next;
      });
      setToast((error as Error).message);
    } finally {
      setSavingHabitId(null);
    }
  };

  return (
    <section className="due-panel" aria-labelledby="due-today-title">
      <div className="section-heading">
        <div>
          <h2 id="due-today-title">Due Today</h2>
        </div>
        <span>{dueTodayHabits.length} left</span>
      </div>

      {toast && (
        <p className="toast" role="status" aria-live="polite">
          {toast}
        </p>
      )}

      {dueTodayHabits.length === 0 ? (
        <div className="done-state">
          <h3>All clear for today</h3>
          <p>No pending habits are due right now.</p>
        </div>
      ) : (
        <div className="due-list">
          {dueTodayHabits.map((habit) => {
            const value = countValues[habit.id] ?? habit.targetValue;

            return (
              <DueTodayCard
                key={habit.id}
                habit={habit}
                value={value}
                savingHabitId={savingHabitId}
                onMarkDone={markDone}
                onChangeValue={(habitId, nextValue) =>
                  setCountValues((currentValues) => ({
                    ...currentValues,
                    [habitId]: nextValue,
                  }))
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
