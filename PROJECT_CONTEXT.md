# Streaks - Habit Tracker Application Context

## Project Overview
**Streaks** is a React + Firebase habit tracking web application built with Vite and TypeScript for a hackathon. The app enables users to register, log in, and track their daily habits with secure authentication and data isolation.

## Tech Stack
- **Frontend**: React 19.2.6 with TypeScript
- **Build Tool**: Vite 8.0.12
- **Authentication**: Firebase Auth (Email/Password)
- **Database**: Firebase Firestore
- **Routing**: React Router DOM
- **Styling**: Inline CSS (responsive design)
- **Code Quality**: ESLint with TypeScript support

## Current Project Structure
```
src/
├── lib/
│   └── firebase.ts                 # Firebase config with Auth & Firestore initialization
├── contexts/
│   └── AuthContext.tsx             # Global auth state management with useAuth hook
├── components/
│   ├── ProtectedRoute.tsx           # Route guard component
│   └── Navbar.tsx                   # App header with user email and logout
├── pages/
│   ├── Login.tsx                    # Auth page (register/login toggle)
│   └── Dashboard.tsx                # Protected dashboard view
├── App.tsx                          # Main router with BrowserRouter setup
├── main.tsx                         # React entry point
└── index.css                        # Global styles

firestore.rules                      # Firestore security rules file
package.json                         # Dependencies & scripts
```

## Completed Features

### 1. Firebase Integration ✅
- Initialized Firebase with project credentials
- Configured Firebase Authentication (Email/Password)
- Configured Firebase Firestore database
- Exports: `auth` (Auth instance) and `db` (Firestore instance)

### 2. Authentication System ✅
- **AuthContext** (`useAuth` hook) manages:
  - User session state
  - `login(email, password)` - Sign in with email/password
  - `register(email, password)` - Create account AND create user document in Firestore
  - `logout()` - Sign out and clear session
  - Real-time auth state listening via `onAuthStateChanged`

### 3. User Data Storage ✅
- When registering, user document is created in Firestore:
  - Collection: `users`
  - Document ID: Firebase UID
  - Fields: `userId`, `email`, `createdAt`
  - Enables data isolation enforcement

### 4. Protected Routes ✅
- `ProtectedRoute` component wraps authenticated pages
- Unauthenticated users automatically redirected to `/login`
- Used for `/dashboard` route

### 5. Firestore Security Rules ✅
- File: `firestore.rules`
- Rules enforce strict data isolation:
  - Users can only CREATE documents if `request.auth.uid == request.resource.data.userId`
  - Users can only READ, UPDATE, DELETE if `request.auth.uid == resource.data.userId`
- Applied to all documents database-wide

### 6. User Interface ✅
**Login Page (`/login`)**
- Email input field
- Password input field
- Toggle between Login and Register modes
- Error handling with alerts

**Navbar**
- App title "Streaks"
- Displays logged-in user's email
- Logout button with redirect to login

**Dashboard (`/dashboard`)**
- Protected route (redirects to login if not authenticated)
- Displays Navbar
- Welcome message and ready for habit tracking features

### 7. Routing ✅
- `/login` - Login/Register page
- `/dashboard` - Protected dashboard
- `/` - Redirects to dashboard (or login if not authenticated)
- BrowserRouter wraps entire app with AuthProvider

## Dependencies Installed
```json
{
  "react": "^19.2.6",
  "react-dom": "^19.2.6",
  "react-router-dom": "^6.x",
  "firebase": "^10.x"
}
```

## Build & Run Commands
```bash
npm run dev      # Start dev server (http://localhost:5173/)
npm run build    # Production build (TypeScript + Vite)
npm run lint     # ESLint check
npm run preview  # Preview production build
```

## Current State
✅ **Development server running** at `http://localhost:5173/`
✅ **All linting errors resolved**
✅ **TypeScript compilation successful**
✅ **Authentication functional**
✅ **User data persisting in Firestore**

## Next Steps for Future Development

### Immediate
1. Deploy Firestore Security Rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Habit Tracking Features
- [ ] Create Habit form (name, frequency, description)
- [ ] Store habits in Firestore (`habits` collection with `userId` field)
- [ ] Display user's habits on dashboard
- [ ] Daily habit logging/check-in feature
- [ ] Streak counter (consecutive days completed)
- [ ] Statistics dashboard (habits completed this week/month)
- [ ] Edit/Delete habits

### UI/UX Enhancements
- [ ] Replace inline CSS with Tailwind CSS or styled-components
- [ ] Add habit cards with visual indicators
- [ ] Responsive mobile design optimization
- [ ] Loading states and skeleton screens
- [ ] Success/error toast notifications
- [ ] Dark mode support

### Additional Features
- [ ] Habit analytics & charts
- [ ] Reminders/notifications
- [ ] Social sharing of streaks
- [ ] Backup/export data
- [ ] User profile settings

## Important Files to Reference

| File | Purpose |
|------|---------|
| [src/lib/firebase.ts](src/lib/firebase.ts) | Firebase initialization |
| [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) | Auth state + Firestore user creation |
| [src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx) | Route protection logic |
| [firestore.rules](firestore.rules) | Data access control |
| [src/App.tsx](src/App.tsx) | Main router & app setup |

## Key Implementation Details

### Authentication Flow
1. User registers → Firebase creates auth user → App creates Firestore user document
2. User logs in → Firebase validates credentials → App retrieves user
3. User logs out → Firebase clears session → App redirects to login
4. Session persists on page reload via `onAuthStateChanged`

### Data Isolation Pattern
All Firestore collections should follow this pattern:
```javascript
// When creating documents, always include userId
await setDoc(doc(db, 'collection', docId), {
  userId: user.uid,  // This is the key!
  ...otherData
});

// Security rules automatically enforce access
```

### Adding New Collections
Example: Creating a `habits` collection
```typescript
// Security rules already support this pattern
const habitsRef = collection(db, 'habits');
await addDoc(habitsRef, {
  userId: user.uid,  // Required for security rules
  name: 'Morning Run',
  frequency: 'daily',
  createdAt: new Date()
});
```

## Environment Setup
- Node.js/npm installed
- Firebase project created with:
  - Authentication (Email/Password enabled)
  - Firestore database initialized
  - Web app credentials in `src/lib/firebase.ts`

## Notes for Future Developers
- Always include `userId: user.uid` in Firestore documents for security rules to work
- The `useAuth()` hook must be used within components wrapped by `AuthProvider`
- TypeScript strict mode is enabled (`verbatimModuleSyntax`)
- Hot Module Replacement (HMR) is active in dev mode for fast iteration