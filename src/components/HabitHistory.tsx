import type { HabitHistoryEntry } from '../types/habit';

interface HabitHistoryProps {
  entries: HabitHistoryEntry[];
}

export default function HabitHistory({ entries }: HabitHistoryProps) {
  if (entries.length === 0) {
    return (
      <section className="empty-state" aria-label="Habit history">
        <h3>No history yet</h3>
        <p>Complete a habit and its history will appear here.</p>
      </section>
    );
  }

  return (
    <section className="habit-list" aria-label="Habit history">
      <div>
        <p className="eyebrow">History</p>
        <h3>Last 30 days</h3>
      </div>

      <div className="history-list">
        {entries.map((entry) => (
          <article className="history-row" key={`${entry.habitId}-${entry.date}`}>
            <div>
              <h4>{entry.habitName}</h4>
              <p>{entry.date}</p>
            </div>
            <span className={`history-status history-status--${entry.status.toLowerCase().replace(' ', '-')}`}>
              {entry.status}
            </span>
            {entry.value > 0 && <span>{entry.value}</span>}
            {entry.reason && <span>{entry.reason}</span>}
          </article>
        ))}
      </div>
    </section>
  );
}
