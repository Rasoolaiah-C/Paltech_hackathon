# Streaks — Habit Tracker

React + TypeScript + Vite habit tracker with Firebase Authentication and Firestore persistence.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, React Router
- **Auth:** Firebase Auth (email/password; passwords hashed by Firebase)
- **Database:** Cloud Firestore (real-time sync)
- **Styling:** Global CSS with design tokens

## Persistence (FR32)

All application data is stored in **Firebase Firestore** and survives restarts:

| Collection / path | Contents |
|-------------------|----------|
| `users/{userId}` | Profile (`email`, `createdAt`) |
| `habits/{habitId}` | Habit configuration (`userId` for isolation) |
| `habits/{habitId}/checkIns/{date}` | One check-in per habit per date |
| `habits/{habitId}/exceptions/{id}` | Single-day or date-range exceptions |
| `habits/{habitId}/reminders/default` | At most one reminder per habit |
| `users/{userId}/badges/{badgeId}` | Earned badges with `earnedAt` timestamp |

Security rules in `firestore.rules` ensure users can only access their own documents.

## Badges (FR26)

Fixed badge set (awarded automatically and stored permanently):

| Badge ID | Title | Criteria |
|----------|-------|------------|
| `first-check-in` | First Step | Complete any habit once (Done check-in) |
| `streak-7` | 7-Day Streak | Longest streak ≥ 7 on any habit |
| `streak-30` | 30-Day Streak | Longest streak ≥ 30 on any habit |
| `completions-100` | Century Club | 100 total Done check-ins across all habits |
| `five-active-habits` | Habit Builder | 5 active habits at the same time |

Earned badges are never revoked (FR27). View them under **Badges** in the app.

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

## Deploy Firestore rules

```bash
firebase deploy --only firestore:rules
```
