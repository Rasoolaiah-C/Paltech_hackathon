import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BADGE_DEFINITIONS } from '../constants/badges';
import { useCheckIns } from '../hooks/useCheckIns';
import { useExceptions } from '../hooks/useExceptions';
import { useReminder } from '../hooks/useReminders';
import type { CheckInStatus, HabitWithProgress } from '../types/habit';
import HabitStreaks from './HabitStreaks';
import { calculateHabitStats, isHabitScheduledOnDate } from '../utils/habitStats';
import { getLastLocalDateKeys, isOlderThanDays, toLocalDateKey } from '../utils/localDate';
import { isValidReminderTime } from '../utils/validation';

interface HabitDetailProps {
  earnedBadgeIds: Set<string>;
  eligibleBadgeIds: Set<string>;
  habit: HabitWithProgress;
  initialSection?: 'overview' | 'reminder';
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
}

const CHECK_IN_PAGE_SIZE = 30;
const statusOptions: CheckInStatus[] = ['Done', 'Partial', 'Skipped'];
const historyClass = (status: string) => `history-dot history-dot--${status.toLowerCase()}`;

export default function HabitDetail({
  earnedBadgeIds,
  eligibleBadgeIds,
  habit,
  initialSection,
  onArchive,
  onDelete,
  onPause,
  onResume,
}: HabitDetailProps) {
  const { checkIns, deleteCheckIn, upsertCheckIn } = useCheckIns(habit.id);
  const { addException, editException, exceptions, removeException } = useExceptions(habit.id);
  const [reminderDraft, setReminderDraft] = useState<{ enabled: boolean; time: string } | null>(null);
  const reminderSectionRef = useRef<HTMLFormElement | null>(null);
  const [activeSection, setActiveSection] = useState(initialSection ?? 'overview');
  const onReminderDue = useCallback(() => {
    window.alert(`Reminder: ${habit.name} is scheduled now. Complete your habit.`);
  }, [habit.name]);
  const { reminder, removeReminder, saveReminder } = useReminder(habit.id, onReminderDue);
  const [allowBackdate, setAllowBackdate] = useState(false);
  const [checkInDate, setCheckInDate] = useState(toLocalDateKey());
  const [status, setStatus] = useState<CheckInStatus>('Done');
  const [value, setValue] = useState(habit.targetValue);
  const [note, setNote] = useState('');
  const [exceptionDate, setExceptionDate] = useState(toLocalDateKey());
  const [exceptionReason, setExceptionReason] = useState('');
  const [editingExceptionDate, setEditingExceptionDate] = useState<string | null>(null);
  const [editingExceptionReason, setEditingExceptionReason] = useState('');
  const reminderTime = reminderDraft?.time ?? reminder?.time ?? '09:00';
  const reminderEnabled = reminderDraft?.enabled ?? reminder?.enabled ?? false;
  const [checkInPage, setCheckInPage] = useState(0);
  const [message, setMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  useEffect(() => {
    if (initialSection === 'reminder') {
      setActiveSection('reminder');
    }
  }, [initialSection]);

  useEffect(() => {
    if (activeSection === 'reminder' && reminderSectionRef.current) {
      reminderSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      reminderSectionRef.current.focus();
    }
  }, [activeSection]);

  const stats = useMemo(() => calculateHabitStats(habit, checkIns, exceptions), [checkIns, exceptions, habit]);
  const checkInsByDate = useMemo(() => new Map(checkIns.map((checkIn) => [checkIn.date, checkIn])), [checkIns]);
  const exceptionsByDate = useMemo(
    () => new Map(exceptions.map((exception) => [exception.date, exception])),
    [exceptions],
  );
  const historyDays = getLastLocalDateKeys(30).reverse();
  const pagedCheckIns = checkIns.slice(
    checkInPage * CHECK_IN_PAGE_SIZE,
    checkInPage * CHECK_IN_PAGE_SIZE + CHECK_IN_PAGE_SIZE,
  );
  const totalCheckInPages = Math.max(1, Math.ceil(checkIns.length / CHECK_IN_PAGE_SIZE));

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

  const handleReminderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    if (!isValidReminderTime(reminderTime)) {
      setMessage('Reminder time must be a valid 24-hour HH:MM value.');
      return;
    }

    try {
      await saveReminder(reminderTime, reminderEnabled);
      setMessage('Reminder saved.');
    } catch (error) {
      setMessage((error as Error).message);
    }
  };

  const handleStatusAction = async (action: () => Promise<void>) => {
    setStatusMessage('');
    try {
      await action();
      setStatusMessage('Habit status updated.');
    } catch (error) {
      setStatusMessage((error as Error).message);
    }
  };

  return (
    <section className="habit-detail-panel" aria-label={`${habit.name} details`}>
      {(message || statusMessage) && (
        <p className="toast" role="status" aria-live="polite">
          {message || statusMessage}
        </p>
      )}

      <div className="habit-detail-tabs">
        <button
          className={activeSection === 'overview' ? 'button button--secondary' : 'button button--ghost'}
          onClick={() => setActiveSection('overview')}
          type="button"
        >
          Overview
        </button>
        <button
          className={activeSection === 'reminder' ? 'button button--secondary' : 'button button--ghost'}
          onClick={() => setActiveSection('reminder')}
          type="button"
        >
          Reminder
        </button>
      </div>

      <article className="habit-config-card">
        <h3>Configuration</h3>
        <p>{habit.description || 'No description'}</p>
        <ul className="habit-config-list">
          <li>Category: {habit.category || 'Uncategorized'}</li>
          <li>
            Target: {habit.targetType}
            {habit.targetType === 'Count' ? ` (${habit.targetValue} ${habit.unitLabel})` : ''}
          </li>
          <li>Schedule: {habit.scheduleType}</li>
          <li>
            Dates: {habit.startDate}
            {habit.endDate ? ` to ${habit.endDate}` : ''}
          </li>
          <li>Status: {habit.status}</li>
        </ul>
        <div className="habit-card__actions">
          {habit.status === 'Active' && (
            <button className="button button--secondary" onClick={() => handleStatusAction(onPause)} type="button">
              Pause habit
            </button>
          )}
          {habit.status === 'Paused' && (
            <button className="button" onClick={() => handleStatusAction(onResume)} type="button">
              Resume habit
            </button>
          )}
          {habit.status !== 'Archived' && (
            <button className="button button--ghost" onClick={() => handleStatusAction(onArchive)} type="button">
              Archive habit
            </button>
          )}
          {habit.status === 'Archived' && (
            <button className="button" onClick={() => handleStatusAction(onResume)} type="button">
              Unarchive habit
            </button>
          )}
          <button
            className="button button--danger"
            onClick={() => {
              if (window.confirm(`Delete "${habit.name}" and all related data?`)) {
                void onDelete();
              }
            }}
            type="button"
          >
            Delete habit
          </button>
        </div>
      </article>

      <HabitStreaks
        currentStreak={habit.currentStreak}
        longestStreak={habit.longestStreak}
        scheduleType={habit.scheduleType}
      />

      <div className="stats-row">
        <article>
          <span>{stats.totalCompletions}</span>
          <p>Total done</p>
        </article>
        <article>
          <span>{Math.round(stats.completionRate30Days * 100)}%</span>
          <p>30-day rate</p>
        </article>
      </div>

      <section className="badge-grid" aria-label="Badge eligibility for this habit">
        {BADGE_DEFINITIONS.map((badge) => {
          const earned = earnedBadgeIds.has(badge.id);
          const eligible = eligibleBadgeIds.has(badge.id);

          return (
            <article className={earned ? 'badge-card badge-card--earned' : 'badge-card'} key={badge.id}>
              <div aria-hidden="true">{earned ? '★' : eligible ? '◐' : '☆'}</div>
              <h3>{badge.title}</h3>
              <p>
                {earned
                  ? 'Earned and saved to your profile.'
                  : eligible
                    ? 'Eligible now — awarding...'
                    : badge.criteria}
              </p>
            </article>
          );
        })}
      </section>

      <div className="heatmap" aria-label="30 day habit history">
        {historyDays.map((date) => {
          const checkIn = checkInsByDate.get(date);
          const exception = exceptionsByDate.get(date);
          const scheduled = isHabitScheduledOnDate(habit, date, exceptions);
          const visualStatus = exception
            ? 'exception'
            : (checkIn?.status.toLowerCase() ??
              (scheduled && date < toLocalDateKey() ? 'missed' : 'empty'));

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
          Backdate (up to 7 days)
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

      <section className="habit-list" aria-label="Check-in history">
        <h3>Check-in history</h3>
        {pagedCheckIns.length === 0 ? (
          <p>No check-ins yet.</p>
        ) : (
          <div className="history-list">
            {pagedCheckIns.map((checkIn) => (
              <article className="history-row" key={checkIn.id}>
                <div>
                  <h4>{checkIn.date}</h4>
                  <p>
                    {checkIn.status}
                    {checkIn.value !== undefined ? ` · ${checkIn.value}` : ''}
                    {checkIn.note ? ` · ${checkIn.note}` : ''}
                  </p>
                </div>
                <button
                  className="button button--danger"
                  onClick={async () => {
                    try {
                      await deleteCheckIn(checkIn.date);
                      setMessage('Check-in removed.');
                    } catch (error) {
                      setMessage((error as Error).message);
                    }
                  }}
                  type="button"
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        )}
        {checkIns.length > CHECK_IN_PAGE_SIZE && (
          <div className="pagination">
            <button
              className="button button--secondary"
              disabled={checkInPage === 0}
              onClick={() => setCheckInPage((current) => current - 1)}
              type="button"
            >
              Previous
            </button>
            <span>
              Page {checkInPage + 1} of {totalCheckInPages}
            </span>
            <button
              className="button button--secondary"
              disabled={checkInPage + 1 >= totalCheckInPages}
              onClick={() => setCheckInPage((current) => current + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        )}
      </section>

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
              {editingExceptionDate === exception.date ? (
                <>
                  <label className="sr-only" htmlFor={`exception-reason-${exception.id}`}>
                    Exception reason
                  </label>
                  <input
                    id={`exception-reason-${exception.id}`}
                    aria-label="Exception reason"
                    onChange={(event) => setEditingExceptionReason(event.target.value)}
                    placeholder="Reason"
                    value={editingExceptionReason}
                  />
                  <button
                    className="button button--ghost"
                    onClick={async () => {
                      try {
                        await editException(exception.date, editingExceptionReason);
                        setEditingExceptionDate(null);
                        setMessage('Exception updated.');
                      } catch (error) {
                        setMessage((error as Error).message);
                      }
                    }}
                    type="button"
                  >
                    Save
                  </button>
                  <button
                    className="button button--ghost"
                    onClick={() => setEditingExceptionDate(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span>
                    {exception.date} {exception.reason ? `- ${exception.reason}` : ''}
                  </span>
                  <button
                    className="button button--ghost"
                    onClick={() => {
                      setEditingExceptionDate(exception.date);
                      setEditingExceptionReason(exception.reason ?? '');
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="button button--danger"
                    onClick={async () => {
                      try {
                        await removeException(exception.date);
                        setMessage('Exception removed.');
                      } catch (error) {
                        setMessage((error as Error).message);
                      }
                    }}
                    type="button"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </form>

      <form
        className="detail-form"
        onSubmit={handleReminderSubmit}
        ref={reminderSectionRef}
        tabIndex={-1}
      >
        <h3>Reminder</h3>
        <label className="inline-control">
          <input
            checked={reminderEnabled}
            onChange={(event) =>
              setReminderDraft({ time: reminderTime, enabled: event.target.checked })
            }
            type="checkbox"
          />
          Enabled
        </label>
        <label>
          Time (HH:MM)
          <input
            onChange={(event) =>
              setReminderDraft({ time: event.target.value, enabled: reminderEnabled })
            }
            pattern="^([01]\\d|2[0-3]):[0-5]\\d$"
            placeholder="09:00"
            required
            type="time"
            value={reminderTime}
          />
        </label>
        <div className="habit-card__actions">
          <button className="button" type="submit">
            Save Reminder
          </button>
          {reminder && (
            <button
              className="button button--danger"
              onClick={async () => {
                try {
                  await removeReminder();
                  setReminderDraft(null);
                  setMessage('Reminder removed.');
                } catch (error) {
                  setMessage((error as Error).message);
                }
              }}
              type="button"
            >
              Remove Reminder
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
