# Streaks Habit Tracker - AI Context Prompt

You are working on **Streaks**, a React + Firebase habit tracking web application. Here's what's been built:

## Architecture
- **Frontend**: React 19 + TypeScript + Vite
- **Auth**: Firebase Email/Password Authentication
- **Database**: Firestore with strict security rules
- **Routing**: React Router with protected routes
- **State**: AuthContext for global user session

## Core Implementation

### 1. Authentication (AuthContext.tsx)
```
- useAuth() hook for accessing {user, login, register, logout}
- register() creates both Auth user AND Firestore user document
- Real-time session persistence with onAuthStateChanged
```

### 2. Security Pattern (firestore.rules)
```
- Only users can access their own data (userId == request.auth.uid)
- ALL documents must have userId field for rules to work
- Pattern applies database-wide
```

### 3. Route Structure
```
/login       → Login/Register page (public)
/dashboard   → Protected dashboard (requires auth)
/            → Redirects to /dashboard
```

### 4. Firestore Collections Schema
```
users/
  {uid}/
    - userId: string (matches Auth UID)
    - email: string
    - createdAt: timestamp

habits/ (future)
  {docId}/
    - userId: string (REQUIRED for security)
    - name: string
    - frequency: string
    - createdAt: timestamp
```

## Key Files
- `src/lib/firebase.ts` - Firebase config & initialization
- `src/contexts/AuthContext.tsx` - Auth state management & Firestore user creation
- `src/components/ProtectedRoute.tsx` - Route guard
- `firestore.rules` - Security rules
- `src/App.tsx` - Router setup

## Critical Pattern
When adding features, ALWAYS include `userId` in Firestore documents:
```typescript
await setDoc(doc(db, 'collection', id), {
  userId: user.uid,  // ← REQUIRED
  ...data
});
```

## Current Status
✅ Project scaffolded and running
✅ Auth system fully functional
✅ Firestore rules enforced
✅ User data persisting on registration
✅ Dev server running on http://localhost:5173/

## Next Phase
Implement habit CRUD operations following the userId isolation pattern. All features should include userId in document creation to leverage existing security rules.

## Testing Notes
- Register creates user doc in Firestore (verify in console)
- Unauth users redirected to /login
- Logout clears session
- Page reload preserves session