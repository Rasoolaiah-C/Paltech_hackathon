import { useHabits } from '../hooks/useHabits';

const badgeDefinitions = [
  {
    id: 'first-check-in',
    title: 'First Step',
    criteria: 'Complete any habit once.',
  },
  {
    id: 'streak-7',
    title: '7-Day Streak',
    criteria: 'Reach a 7-day streak on any habit.',
  },
  {
    id: 'streak-30',
    title: '30-Day Streak',
    criteria: 'Reach a 30-day streak on any habit.',
  },
];

export default function Badges() {
  const { habits, loading } = useHabits();
  const totalCompletions = habits.reduce(
    (count, habit) => count + habit.checkIns.filter((checkIn) => checkIn.status === 'Done').length,
    0,
  );
  const longestCurrentStreak = Math.max(0, ...habits.map((habit) => habit.currentStreak));
  const earnedBadgeIds = new Set<string>();

  if (totalCompletions > 0) {
    earnedBadgeIds.add('first-check-in');
  }

  if (longestCurrentStreak >= 7) {
    earnedBadgeIds.add('streak-7');
  }

  if (longestCurrentStreak >= 30) {
    earnedBadgeIds.add('streak-30');
  }

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
        <div className="badge-grid">
          {badgeDefinitions.map((badge) => {
            const earned = earnedBadgeIds.has(badge.id);

            return (
              <article className={earned ? 'badge-card badge-card--earned' : 'badge-card'} key={badge.id}>
                <div aria-hidden="true">{earned ? '★' : '☆'}</div>
                <h3>{badge.title}</h3>
                <p>{earned ? 'Earned from your current progress.' : badge.criteria}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
