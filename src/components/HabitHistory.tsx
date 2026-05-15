import { useMemo, useState } from 'react';
import type { HabitHistoryEntry } from '../types/habit';
import { groupHistoryByDay } from '../utils/dayHistory';

const DAYS_PER_PAGE = 7;

interface HabitHistoryProps {
  entries: HabitHistoryEntry[];
}

const statusClass = (status: HabitHistoryEntry['status']) =>
  `day-habit-chip day-habit-chip--${status.toLowerCase().replace(' ', '-')}`;

export default function HabitHistory({ entries }: HabitHistoryProps) {
  const [page, setPage] = useState(0);
  const dayGroups = useMemo(() => groupHistoryByDay(entries), [entries]);
  const totalPages = Math.max(1, Math.ceil(dayGroups.length / DAYS_PER_PAGE));
  const pagedDays = dayGroups.slice(page * DAYS_PER_PAGE, page * DAYS_PER_PAGE + DAYS_PER_PAGE);

  if (entries.length === 0) {
    return (
      <section className="empty-state" aria-label="Habit history">
        <h3>No history yet</h3>
        <p>Complete a habit and your day-by-day timeline will appear here.</p>
      </section>
    );
  }

  return (
    <section className="history-timeline" aria-label="Day by day history">
      <header className="section-heading">
        <div>
          <p className="eyebrow">Timeline</p>
          <h3>Last 30 days</h3>
        </div>
        <span>{dayGroups.length} days tracked</span>
      </header>

      <div className="day-history-list">
        {pagedDays.map((day) => (
          <article className="day-history-card" key={day.date}>
            <header className="day-history-card__header">
              <div>
                <h4>{day.label}</h4>
                <p>{day.date}</p>
              </div>
              <div className="day-summary" aria-label={`Summary for ${day.label}`}>
                {day.summary.done > 0 && <span className="day-summary__pill day-summary__pill--done">{day.summary.done} done</span>}
                {day.summary.missed > 0 && (
                  <span className="day-summary__pill day-summary__pill--missed">{day.summary.missed} missed</span>
                )}
                {day.summary.pending > 0 && (
                  <span className="day-summary__pill day-summary__pill--pending">{day.summary.pending} pending</span>
                )}
                {day.summary.paused > 0 && (
                  <span className="day-summary__pill day-summary__pill--paused">{day.summary.paused} paused</span>
                )}
              </div>
            </header>

            <ul className="day-habit-list">
              {day.entries
                .filter((entry) => entry.status !== 'Not due')
                .map((entry) => (
                  <li className={statusClass(entry.status)} key={`${entry.habitId}-${entry.date}`}>
                    <span className="day-habit-chip__name">{entry.habitName}</span>
                    <span className="day-habit-chip__status">{entry.status}</span>
                    {entry.value > 0 && <span className="day-habit-chip__value">{entry.value}</span>}
                    {entry.reason && <span className="day-habit-chip__reason">{entry.reason}</span>}
                  </li>
                ))}
              {day.entries.every((entry) => entry.status === 'Not due') && (
                <li className="day-habit-chip day-habit-chip--empty">No habits scheduled this day</li>
              )}
            </ul>
          </article>
        ))}
      </div>

      {dayGroups.length > DAYS_PER_PAGE && (
        <div className="pagination">
          <button
            className="button button--secondary"
            disabled={page === 0}
            onClick={() => setPage((current) => current - 1)}
            type="button"
          >
            Newer
          </button>
          <span>
            Week {page + 1} of {totalPages}
          </span>
          <button
            className="button button--secondary"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Older
          </button>
        </div>
      )}
    </section>
  );
}
