import { useState } from 'react';
import CreateHabitForm from '../components/CreateHabitForm';
import HabitHistory from '../components/HabitHistory';
import HabitList from '../components/HabitList';
import { useHabits } from '../hooks/useHabits';
import type { CheckInStatus, HabitStatus, HabitWithProgress } from '../types/habit';

import { toLocalDateKey } from '../utils/localDate';

const today = () => toLocalDateKey();

export default function AllHabits() {
  const {
    createHabit,
    deleteHabit,
    error,
    habits,
    history,
    loading,
    pauseHabit,
    recordCheckIn,
    updateHabit,
    updateHabitStatus,
  } = useHabits();
  const [editingHabit, setEditingHabit] = useState<HabitWithProgress | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'history'>('list');
  const [statusFilter, setStatusFilter] = useState<HabitStatus>('Active');
  const [sortBy, setSortBy] = useState<'name' | 'recent'>('name');

  const filteredHabits = habits
    .filter((habit) => habit.status === statusFilter)
    .sort((leftHabit, rightHabit) => {
      if (sortBy === 'recent') {
        const leftDate = leftHabit.checkIns[0]?.date ?? '';
        const rightDate = rightHabit.checkIns[0]?.date ?? '';
        return rightDate.localeCompare(leftDate);
      }

      return leftHabit.name.localeCompare(rightHabit.name);
    });

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
    <section className="dashboard">
      <header className="dashboard__header">
        <div>
          <p className="eyebrow">Manage</p>
          <h2>All Habits</h2>
        </div>
        <div className="dashboard__actions dashboard__actions--tabs">
          <button
            className={activeTab === 'list' ? 'tab-button tab-button--active' : 'tab-button'}
            onClick={() => setActiveTab('list')}
            type="button"
          >
            List
          </button>
          <button
            className={activeTab === 'history' ? 'tab-button tab-button--active' : 'tab-button'}
            onClick={() => {
              setEditingHabit(null);
              setIsFormOpen(false);
              setActiveTab('history');
            }}
            type="button"
          >
            History
          </button>
          <button
            className="button"
            onClick={() => {
              setActiveTab('list');
              setEditingHabit(null);
              setIsFormOpen((current) => !current);
            }}
            type="button"
          >
            {isFormOpen ? 'Close Form' : 'Add Habit'}
          </button>
        </div>
      </header>

      {activeTab === 'list' && (
        <div className="toolbar" aria-label="Habit filters">
          <label>
            Status
            <select onChange={(event) => setStatusFilter(event.target.value as HabitStatus)} value={statusFilter}>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Archived">Archived</option>
            </select>
          </label>
          <label>
            Sort
            <select onChange={(event) => setSortBy(event.target.value as 'name' | 'recent')} value={sortBy}>
              <option value="name">Name</option>
              <option value="recent">Most recent check-in</option>
            </select>
          </label>
        </div>
      )}

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
        {!loading &&
          (activeTab === 'history' ? (
            <HabitHistory entries={history} />
          ) : (
            <HabitList
              emptyMessage="No habits match this filter."
              habits={filteredHabits}
              onDeleteHabit={deleteHabit}
              onEditHabit={(habit) => {
                setIsFormOpen(false);
                setEditingHabit(habit);
              }}
              onPauseHabit={pauseHabit}
              onRecordCheckIn={handleRecordCheckIn}
              onUpdateStatus={updateHabitStatus}
              title={`${statusFilter} habits`}
            />
          ))}
      </div>
    </section>
  );
}
