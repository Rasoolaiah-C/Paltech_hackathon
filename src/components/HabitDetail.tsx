import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useCheckIns } from '../hooks/useCheckIns';
import { useExceptions } from '../hooks/useExceptions';
import type { CheckInStatus, Habit } from '../types/habit';
import { calculateHabitStats, isHabitScheduledOnDate } from '../utils/habitStats';
import { getLastLocalDateKeys, isOlderThanDays, toLocalDateKey } from '../utils/localDate';

interface HabitDetailProps {
  habit: Habit;
}

const statusOptions: CheckInStatus[] = ['Done', 'Partial', 'Skipped'];

const historyClass = (status: string) => `history-dot history-dot--${status.toLowerCase()}`;

export default function HabitDetail({ habit }: HabitDetailProps) {
  const { checkIns, upsertCheckIn } = useCheckIns(habit.id);
  const { addException, editException, exceptions, removeException } = useExceptions(habit.id);
  const [allowBackdate, setAllowBackdate] = useState(false);
  const [checkInDate, setCheckInDate] = useState(toLocalDateKey());
  const [status, setStatus] = useState<CheckInStatus>('Done');
  const [value, setValue] = useState(habit.targetValue);
  const [note, setNote] = useState('');
  const [exceptionDate, setExceptionDate] = useState(toLocalDateKey());
  const [exceptionReason, setExceptionReason] = useState('');
  const [message, setMessage] = useState('');
  const stats = useMemo(() => calculateHabitStats(habit, checkIns, exceptions), [checkIns, exceptions, habit]);
  const checkInsByDate = useMemo(() => new Map(checkIns.map((checkIn) => [checkIn.date, checkIn])), [checkIns]);
  const exceptionsByDate = useMemo(
    () => new Map(exceptions.map((exception) => [exception.date, exception])),
    [exceptions],
  );
  const historyDays = getLastLocalDateKeys(30).reverse();

  const handleCheckInSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    const date = allowBackdate ? checkInDate : toLocalDateKey();

    if (allowBackdate && isOlderThanDays(date, 7)) {
      setMessage('Backdated check-ins are limited to the last 7 days.');
      return;
    }

    try {
      await upsertCheckIn({
        date,
        status,
        value: habit.targetType === 'Count' ? value : 1,
        note,
      });
      setMessage('Check-in saved.');
      setNote('');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const handleExceptionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    try {
      await addException(exceptionDate, exceptionReason);
      setMessage('Exception saved.');
      setExceptionReason('');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  return (
    <section className="habit-detail-panel" aria-label={`${habit.name} details`}>
      <header className="section-heading">
        <div>
          <p className="eyebrow">Habit detail</p>
          <h2>{habit.name}</h2>
        </div>
      </header>

      {message && (
        <p className="toast" role="status" aria-live="polite">
          {message}
        </p>
      )}

      <div className="stats-row">
        <article>
          <span>{stats.currentStreak}</span>
          <p>Current streak</p>
        </article>
        <article>
          <span>{stats.longestStreak}</span>
          <p>Longest streak</p>
        </article>
        <article>
          <span>{stats.totalCompletions}</span>
          <p>Total done</p>
        </article>
        <article>
          <span>{Math.round(stats.completionRate30Days * 100)}%</span>
          <p>30-day rate</p>
        </article>
      </div>

      <div className="heatmap" aria-label="30 day habit history">
        {historyDays.map((date) => {
          const checkIn = checkInsByDate.get(date);
          const exception = exceptionsByDate.get(date);
          const scheduled = isHabitScheduledOnDate(habit, date, exceptions);
          const visualStatus = exception
            ? 'exception'
            : checkIn?.status.toLowerCase()
              ?? (scheduled && date < toLocalDateKey() ? 'missed' : 'empty');

          return (
            <span
              aria-label={`${date}: ${visualStatus}`}
              className={historyClass(visualStatus)}
              key={date}
              title={`${date}: ${visualStatus}`}
            />
          );
        })}
      </div>

      <form className="detail-form" onSubmit={handleCheckInSubmit}>
        <h3>Record check-in</h3>
        <label>
          Status
          <select onChange={(event) => setStatus(event.target.value as CheckInStatus)} value={status}>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {habit.targetType === 'Count' && (
          <label>
            Value
            <input min="0" onChange={(event) => setValue(Number(event.target.value))} type="number" value={value} />
          </label>
        )}

        <label>
          Note
          <input onChange={(event) => setNote(event.target.value)} placeholder="Optional" value={note} />
        </label>

        <label className="inline-control">
          <input checked={allowBackdate} onChange={(event) => setAllowBackdate(event.target.checked)} type="checkbox" />
          Backdate
        </label>

        {allowBackdate && (
          <label>
            Date
            <input
              max={toLocalDateKey()}
              min={getLastLocalDateKeys(8).at(-1)}
              onChange={(event) => setCheckInDate(event.target.value)}
              type="date"
              value={checkInDate}
            />
          </label>
        )}

        <button className="button" type="submit">
          Save Check-in
        </button>
      </form>

      <form className="detail-form" onSubmit={handleExceptionSubmit}>
        <h3>Exceptions</h3>
        <label>
          Date
          <input onChange={(event) => setExceptionDate(event.target.value)} type="date" value={exceptionDate} />
        </label>
        <label>
          Reason
          <input
            onChange={(event) => setExceptionReason(event.target.value)}
            placeholder="Illness, travel, rest day"
            value={exceptionReason}
          />
        </label>
        <button className="button button--secondary" type="submit">
          Add Exception
        </button>

        <div className="exception-list">
          {exceptions.map((exception) => (
            <div key={exception.id}>
              <span>
                {exception.date} {exception.reason ? `- ${exception.reason}` : ''}
              </span>
              <button
                className="button button--ghost"
                onClick={() => editException(exception.date, window.prompt('Reason', exception.reason ?? '') ?? '')}
                type="button"
              >
                Edit
              </button>
              <button className="button button--danger" onClick={() => removeException(exception.date)} type="button">
                Remove
              </button>
            </div>
          ))}
        </div>
      </form>
    </section>
  );
}
