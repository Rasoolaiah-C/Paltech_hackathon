export type TargetType = 'Yes/No' | 'Count';
export type ScheduleType = 'Daily' | 'SpecificWeekdays' | 'WeeklyCount' | 'Monthly';
export type HabitStatus = 'Active' | 'Paused' | 'Archived';
export type CheckInStatus = 'Done' | 'Partial' | 'Skipped';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string;
  category: string;
  targetType: TargetType;
  targetValue: number;
  unitLabel: string;
  scheduleType: ScheduleType;
  scheduleDays: string[];
  weeklyTargetCount: number;
  startDate: string;
  endDate: string;
  status: HabitStatus;
}

export interface CheckIn {
  id: string;
  habitId: string;
  date: string;
  status: CheckInStatus;
  value?: number;
  note?: string;
}

export interface Exception {
  id: string;
  habitId: string;
  date: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
}

export type CreateHabitInput = Omit<Habit, 'id' | 'userId' | 'status'> & {
  status?: HabitStatus;
  reminderEnabled?: boolean;
  reminderTime?: string;
};

export type UpdateHabitInput = Partial<CreateHabitInput> & {
  status?: HabitStatus;
};

export type CheckInInput = Omit<CheckIn, 'id'>;

export interface HabitWithProgress extends Habit {
  checkIns: CheckIn[];
  exceptions: Exception[];
  currentStreak: number;
  longestStreak: number;
  isExpectedToday: boolean;
  isTodayDone: boolean;
  todayCheckIn?: CheckIn;
}

export interface HabitHistoryEntry {
  date: string;
  habitId: string;
  habitName: string;
  expected: boolean;
  status: 'Done' | 'Missed' | 'Paused' | 'Not due' | 'Pending';
  value: number;
  reason: string;
}

export interface BadgeAward {
  id: string;
  badgeId: string;
  earnedAt: string;
}
