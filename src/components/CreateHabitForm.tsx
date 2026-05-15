import type { FormEvent } from 'react';
import { useState } from 'react';
import type { CreateHabitInput, Habit, HabitStatus, ScheduleType, TargetType } from '../types/habit';
import { toLocalDateKey } from '../utils/localDate';

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const today = () => toLocalDateKey();
const timeStep = (unitLabel: string) => {
  const normalisedUnit = unitLabel.trim().toLowerCase();
  return ['hour', 'hours', 'hr', 'hrs'].includes(normalisedUnit) ? 0.25 : 1;
};

interface CreateHabitFormProps {
  onCreateHabit: (habit: CreateHabitInput) => Promise<void>;
  habit?: Habit;
  onCancel?: () => void;
}

export default function CreateHabitForm({ habit, onCancel, onCreateHabit }: CreateHabitFormProps) {
  const isEditing = Boolean(habit);
  const [name, setName] = useState(habit?.name ?? '');
  const [description, setDescription] = useState(habit?.description ?? '');
  const [category, setCategory] = useState(habit?.category ?? '');
  const [targetType, setTargetType] = useState<TargetType>(habit?.targetType ?? 'Yes/No');
  const [targetValue, setTargetValue] = useState(habit?.targetValue ?? 1);
  const [unitLabel, setUnitLabel] = useState(habit?.unitLabel ?? '');
  const [scheduleType, setScheduleType] = useState<ScheduleType>(habit?.scheduleType ?? 'Daily');
  const [scheduleDays, setScheduleDays] = useState<string[]>(habit?.scheduleDays ?? []);
  const [weeklyTargetCount, setWeeklyTargetCount] = useState(habit?.weeklyTargetCount ?? 1);
  const [startDate, setStartDate] = useState(habit?.startDate ?? today());
  const [endDate, setEndDate] = useState(habit?.endDate ?? '');
  const [status, setStatus] = useState<HabitStatus>(habit?.status ?? 'Active');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('');
    setTargetType('Yes/No');
    setTargetValue(1);
    setUnitLabel('');
    setScheduleType('Daily');
    setScheduleDays([]);
    setWeeklyTargetCount(1);
    setStartDate(today());
    setEndDate('');
  };

  const handleWeekdayChange = (weekday: string) => {
    setScheduleDays((currentDays) =>
      currentDays.includes(weekday)
        ? currentDays.filter((day) => day !== weekday)
        : [...currentDays, weekday],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    if (targetType === 'Count' && targetValue <= 0) {
      setError('Target value must be greater than 0.');
      return;
    }

    if (targetType === 'Count' && !unitLabel.trim()) {
      setError('Unit label is required for count habits.');
      return;
    }

    if (scheduleType === 'SpecificWeekdays' && scheduleDays.length === 0) {
      setError('Choose at least one weekday.');
      return;
    }

    if (scheduleType === 'WeeklyCount' && (weeklyTargetCount < 1 || weeklyTargetCount > 7)) {
      setError('Weekly count must be between 1 and 7.');
      return;
    }

    if (endDate && endDate < startDate) {
      setError('End date must be after the start date.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreateHabit({
        name,
        description,
        category,
        targetType,
        targetValue: targetType === 'Count' ? targetValue : 1,
        unitLabel: targetType === 'Count' ? unitLabel : '',
        scheduleType,
        scheduleDays: scheduleType === 'SpecificWeekdays' ? scheduleDays : [],
        weeklyTargetCount,
        startDate,
        endDate,
        status,
      });
      if (isEditing) {
        onCancel?.();
      } else {
        resetForm();
      }
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="habit-form" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">{isEditing ? 'Edit' : 'Create'}</p>
        <h3>{isEditing ? habit?.name : 'New habit'}</h3>
      </div>

      {error && <p className="form-error">{error}</p>}

      <label>
        Name
        <input
          onChange={(event) => setName(event.target.value)}
          placeholder="Drink water"
          required
          value={name}
        />
      </label>

      <label>
        Description
        <textarea
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What counts as success?"
          value={description}
        />
      </label>

      <div className="form-grid">
        <label>
          Category
          <input
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Health"
            value={category}
          />
        </label>

        <label>
          Target type
          <select
            onChange={(event) => {
              const nextTargetType = event.target.value as TargetType;
              setTargetType(nextTargetType);
              if (nextTargetType === 'Yes/No') {
                setTargetValue(1);
                setUnitLabel('');
              }
            }}
            value={targetType}
          >
            <option value="Yes/No">Yes/No</option>
            <option value="Count">Count</option>
          </select>
        </label>
      </div>

      {targetType === 'Count' && (
        <div className="form-grid">
          <label>
            Target value
            <input
              min="1"
              onChange={(event) => setTargetValue(Number(event.target.value))}
              required
              step={timeStep(unitLabel)}
              type="number"
              value={targetValue}
            />
          </label>

          <label>
            Unit label
            <input
              onChange={(event) => setUnitLabel(event.target.value)}
              list="unit-options"
              placeholder="minutes"
              required
              value={unitLabel}
            />
            <datalist id="unit-options">
              <option value="minutes" />
              <option value="hours" />
              <option value="pages" />
              <option value="steps" />
            </datalist>
          </label>
        </div>
      )}

      <div className="form-grid">
        <label>
          Start date
          <input
            onChange={(event) => setStartDate(event.target.value)}
            required
            type="date"
            value={startDate}
          />
        </label>

        <label>
          End date
          <input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
        </label>
      </div>

      <label>
        Schedule
        <select
          onChange={(event) => {
            setScheduleType(event.target.value as ScheduleType);
            setScheduleDays([]);
          }}
          value={scheduleType}
        >
          <option value="Daily">Daily</option>
          <option value="SpecificWeekdays">Specific weekdays</option>
          <option value="WeeklyCount">Weekly count</option>
          <option value="Monthly">Monthly</option>
        </select>
      </label>

      {scheduleType === 'SpecificWeekdays' && (
        <fieldset className="weekday-picker">
          <legend>Days</legend>
          {weekdays.map((weekday) => (
            <label key={weekday}>
              <input
                checked={scheduleDays.includes(weekday)}
                onChange={() => handleWeekdayChange(weekday)}
                type="checkbox"
              />
              {weekday.slice(0, 3)}
            </label>
          ))}
        </fieldset>
      )}

      {isEditing && (
        <label>
          Status
          <select onChange={(event) => setStatus(event.target.value as HabitStatus)} value={status}>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
            <option value="Archived">Archived</option>
          </select>
        </label>
      )}

      {scheduleType === 'WeeklyCount' && (
        <label>
          Weekly completions
          <input
            max="7"
            min="1"
            onChange={(event) => setWeeklyTargetCount(Number(event.target.value))}
            required
            type="number"
            value={weeklyTargetCount}
          />
        </label>
      )}

      <button className="button" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Habit'}
      </button>

      {isEditing && (
        <button className="button button--ghost" onClick={onCancel} type="button">
          Cancel
        </button>
      )}
    </form>
  );
}
