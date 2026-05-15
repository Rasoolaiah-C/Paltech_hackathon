import { BADGE_DEFINITIONS } from '../constants/badges';
import { useBadges } from '../hooks/useBadges';
import { useHabits } from '../hooks/useHabits';

export default function Badges() {
  const { habits, loading: habitsLoading } = useHabits();
  const { awards, error, loading: badgesLoading } = useBadges(habits);
  const loading = habitsLoading || badgesLoading;
  const awardsByBadgeId = new Map(awards.map((award) => [award.badgeId, award]));

  return (
    <section className="dashboard">
      <header className="dashboard__header">
        <div>
          <p className="eyebrow">Progress</p>
          <h2>Badges</h2>
        </div>
      </header>

      {loading ? (
        <div className="route-loading route-loading--inline">Loading badges...</div>
      ) : (
        <>
          {error && <p className="form-error">{error.message}</p>}
          <section className="badge-explanation">
            <p>
              Badges help you stay motivated by rewarding consistency and progress.
              Each registered habit can earn a badge tied to its schedule: daily habits build streak badges for consecutive days, weekly habits earn awards for consecutive completed weeks, and monthly habits reward longer consistency.
            </p>
          </section>
          <section className="habit-badge-summary">
            <h3>Per-habit badge goals</h3>
            <ul>
              {habits.map((habit) => (
                <li key={habit.id}>
                  <strong>{habit.name}</strong> — {habit.scheduleType === 'Daily'
                    ? 'Daily streak badge for consistent daily completion'
                    : habit.scheduleType === 'WeeklyCount'
                      ? 'Weekly consistency badge for meeting your weekly target'
                      : habit.scheduleType === 'Monthly'
                        ? 'Monthly badge for staying consistent each month'
                        : 'Habit badge for scheduled weekday consistency'}
                </li>
              ))}
            </ul>
          </section>
          <div className="badge-grid">
            {BADGE_DEFINITIONS.map((badge) => {
              const award = awardsByBadgeId.get(badge.id);
              const earned = Boolean(award);

              return (
                <article className={earned ? 'badge-card badge-card--earned' : 'badge-card'} key={badge.id}>
                  <div aria-hidden="true">{earned ? '★' : '☆'}</div>
                  <h3>{badge.title}</h3>
                  <p>{earned ? `Earned ${award?.earnedAt || 'recently'}.` : badge.criteria}</p>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
