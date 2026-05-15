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
