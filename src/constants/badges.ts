export interface BadgeDefinition {
  id: string;
  title: string;
  criteria: string;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-check-in',
    title: 'First Step',
    criteria: 'Complete any habit once (Done check-in).',
  },
  {
    id: 'streak-7',
    title: '7-Day Streak',
    criteria: 'Reach a longest streak of 7 or more on any habit.',
  },
  {
    id: 'streak-30',
    title: '30-Day Streak',
    criteria: 'Reach a longest streak of 30 or more on any habit.',
  },
  {
    id: 'completions-100',
    title: 'Century Club',
    criteria: 'Log 100 total Done check-ins across all habits.',
  },
  {
    id: 'five-active-habits',
    title: 'Habit Builder',
    criteria: 'Maintain 5 active habits at the same time.',
  },
];
