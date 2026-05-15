import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import HabitDetail from '../components/HabitDetail';
import { useBadges } from '../hooks/useBadges';
import { useHabits } from '../hooks/useHabits';
import { computeEligibleBadgeIds } from '../utils/badgeEligibility';

export default function HabitDetailPage() {
  const { habitId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { deleteHabit, habits, loading, updateHabitStatus } = useHabits();
  const { earnedBadgeIds } = useBadges(habits);
  const habit = habits.find((currentHabit) => currentHabit.id === habitId);
  const eligibleBadgeIds = computeEligibleBadgeIds(habits);

  if (loading) {
    return <div className="route-loading route-loading--inline">Loading habit...</div>;
  }

  if (!habit) {
    return (
      <section className="empty-state">
        <h3>Habit not found</h3>
        <p>This habit may have been deleted or you do not have access to it.</p>
        <Link className="button" to="/habits">
          Back to habits
        </Link>
      </section>
    );
  }

  const initialSection = searchParams.get('section') === 'reminder' ? 'reminder' : 'overview';

  return (
    <section className="dashboard">
      <header className="dashboard__header">
        <div>
          <p className="eyebrow">Habit</p>
          <h2>{habit.name}</h2>
        </div>
        <Link className="button button--secondary" to="/habits">
          Back to list
        </Link>
      </header>

      <HabitDetail
        initialSection={initialSection}
        earnedBadgeIds={earnedBadgeIds}
        eligibleBadgeIds={eligibleBadgeIds}
        habit={habit}
        onArchive={async () => {
          await updateHabitStatus(habit.id, 'Archived');
          navigate('/habits');
        }}
        onDelete={async () => {
          await deleteHabit(habit.id);
          navigate('/habits');
        }}
        onResume={async () => updateHabitStatus(habit.id, 'Active')}
        onPause={async () => updateHabitStatus(habit.id, 'Paused')}
      />
    </section>
  );
}
