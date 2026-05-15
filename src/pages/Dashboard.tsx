import { useState } from 'react';
import CreateHabitForm from '../components/CreateHabitForm';
import DueTodayPanel from '../components/DueTodayPanel';
import { useHabits } from '../hooks/useHabits';
import type { CheckInStatus, HabitWithProgress } from '../types/habit';

const today = () => new Date().toISOString().slice(0, 10);

export default function Dashboard() {
  const {
    habits,
    createHabit,
    error,
    history,
    loading,
    recordCheckIn,
    updateHabit,
  } = useHabits();
  const [editingHabit, setEditingHabit] = useState<HabitWithProgress | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const currentHabits = habits.filter((habit) => habit.status !== 'Archived');
  const completedToday = currentHabits.filter((habit) => habit.isTodayDone).length;
  const dueToday = currentHabits.filter((habit) => habit.isExpectedToday && !habit.isTodayDone).length;

  const handleRecordCheckIn = async (
    habitId: string,
    status: CheckInStatus,
    value: number,
    note: string,
  ) => {
    await recordCheckIn({
      habitId,
      date: today(),
      status,
      value,
      note,
    });
  };

  return (
    <section className="dashboard dashboard--home">
      <header className="dashboard__header">
        <div>
          <p className="eyebrow">Today</p>
          <h2>Dashboard</h2>
        </div>
        <button
          className="button"
          onClick={() => {
            setEditingHabit(null);
            setIsFormOpen((current) => !current);
          }}
          type="button"
        >
          {isFormOpen ? 'Close Form' : 'Add Habit'}
        </button>
      </header>

      <div className="stats-row" aria-label="Today summary">
        <article>
          <span>{dueToday}</span>
          <p>Due now</p>
        </article>
        <article>
          <span>{completedToday}</span>
          <p>Completed</p>
        </article>
        <article>
          <span>{history.filter((entry) => entry.status === 'Missed').length}</span>
          <p>Missed in 30 days</p>
        </article>
      </div>

      <div className={isFormOpen || editingHabit ? 'dashboard__content' : 'dashboard__content dashboard__content--list'}>
          {(isFormOpen || editingHabit) && (
            <CreateHabitForm
              key={editingHabit?.id ?? 'create'}
              habit={editingHabit ?? undefined}
              onCancel={() => {
                setEditingHabit(null);
                setIsFormOpen(false);
              }}
              onCreateHabit={async (habitInput) => {
                if (editingHabit) {
                  await updateHabit(editingHabit.id, habitInput);
                  setEditingHabit(null);
                } else {
                  await createHabit(habitInput);
                  setIsFormOpen(false);
                }
              }}
            />
          )}

          {loading && <div className="route-loading route-loading--inline">Loading habits...</div>}
          {error && <p className="form-error">{error.message}</p>}
          {!loading && <DueTodayPanel habits={currentHabits} onRecordCheckIn={handleRecordCheckIn} />}
        </div>
    </section>
  );
}
