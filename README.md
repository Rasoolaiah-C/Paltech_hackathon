# Momentum 🌊

> **Build durable habits without friction, because real life doesn't always go according to plan.**

![Momentum Screenshot](./banner.png)

---

## 💡 The Concept

Most habit trackers are designed for robots, not humans. Break your streak once—whether due to illness, vacation, or just needing a rest day—and your 100-day progress resets to zero. That's demoralizing and unrealistic.

**Momentum** flips the script. We built a habit tracker that understands that *real life* is unpredictable. You don't deserve punishment for circumstances beyond your control. Instead, you deserve a tool that:

- **Pauses, doesn't penalizes:** Log exceptions (sick days, travel) without losing your streak.
- **Respects your reality:** Whether you exercise daily or just Mondays and Wednesdays, we get it.
- **Celebrates your journey:** Earn permanent badges and watch your progress compound.

Momentum is designed for anyone building habits—without guilt trips along the way.

---

## ✨ Key Features

- ⚡ **Zero-Friction Logging:** One-click check-ins straight from the home screen. No friction, no friction, no excuses.
- 🧠 **Smart Streaks:** An intelligent streak engine that understands your specific schedule (e.g., Monday/Wednesday/Friday) and respects logged exceptions (sick days, vacations, rest days).
- 🏆 **Gamified Milestones:** Unlock permanent badges as you hit milestones—celebrate your wins, even small ones.
- 📊 **Complete Visibility:** View habit history, analytics, and patterns to understand what's working.
- 🔒 **Total Privacy:** Enterprise-grade security with strict data isolation. Your habits are yours alone—not ours to analyze, sell, or share.

---

## 🛠️ For Developers: The Engine

Momentum isn't just a polished interface—it's backed by thoughtful, production-ready architecture.

**The Stack**
- Frontend: React 19 + TypeScript + Vite for lightning-fast development and builds.
- Backend: Firebase Authentication (passwordless magic link) + Cloud Firestore for real-time data synchronization.
- Infrastructure: Deployed security rules ensure bulletproof data isolation.

**Data Isolation Model**
Every user's data lives in strict isolation. Our Firestore Security Rules enforce that users can *only* read, write, and query documents where `uid == auth.uid`. This means:
- A user cannot fetch another user's habits, even if they know the ID.
- Habit check-ins and exceptions are scoped to the authenticated user.
- Badges and streaks are personal and non-transferable.

**The Streak Algorithm**
The streak calculation is the heart of Momentum. Here's how it works:

1. **Frequency Matching:** Each habit specifies its intended frequency (daily, every weekday, specific days like Mon/Wed/Fri).
2. **Chronological Check-ins:** We maintain an array of `checkIns` (dates when the user completed the habit).
3. **Exception Handling:** A user can log `exceptions` (sick days, vacations) which are fast-forwarded over—streaks remain intact across excused absences.
4. **Dynamic Calculation:** Current and longest streaks are calculated on-the-fly, comparing expected dates against actual check-ins and exceptions.

The result? Fair, forgiving streak math that feels *right*.

---

## 🚀 Getting Started

Ready to run Momentum locally? Follow these simple steps:

### Prerequisites
- **Node.js** (v18 or higher) and **npm**
- **Firebase project** (free tier works; see [Firebase Console](https://console.firebase.google.com))
- A code editor (VS Code recommended)

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/momentum.git
cd momentum

# 2. Install dependencies
npm install

# 3. Create a .env file with your Firebase configuration
# Copy this template and fill in your values from Firebase Console:
cat > .env << EOF
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
EOF

# 4. Start the development server
npm run dev
# Open http://localhost:5173 in your browser
```

### Optional: Deploy Firestore Security Rules

```bash
# Install Firebase CLI globally (one-time only)
npm install -g firebase-tools

# Log in to your Firebase account
firebase login

# Deploy the security rules
firebase deploy --only firestore:rules
```

For detailed Firebase setup, see the [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md).

---

## 🌱 Project Structure

```
src/
├── components/       # React UI components (HabitList, DueTodayPanel, etc.)
├── contexts/         # Global auth state (AuthContext)
├── hooks/            # Custom hooks (useHabits, useCheckIns, useBadges, etc.)
├── pages/            # Full-page views (Dashboard, AllHabits, Badges, etc.)
├── lib/              # Core utilities (Firebase initialization)
├── utils/            # Helpers (streak math, badge eligibility, date logic)
├── types/            # TypeScript interfaces (Habit, Reminder)
└── constants/        # App constants (badge definitions)
```

---

## 📝 Acknowledgements & AI Usage

**This is a 6-hour hackathon project**, built with a thoughtful blend of manual engineering and AI assistance.

**What AI Helped With:**
- Boilerplate React component scaffolding and TypeScript interfaces
- Firebase configuration and initial authentication flow
- CSS styling and responsive layout patterns
- README and documentation structure

**What Was Manually Engineered:**
- Core streak algorithm and business logic
- Data modeling and Firestore schema design
- Security rules and data isolation constraints
- UI/UX refinements and user feedback loops
- Custom hooks for state management

**AI Tools Used:**
- GitHub Copilot for code generation and autocompletion
- Cursor for architectural guidance and documentation

The result? A production-grade habit tracker that's both thoughtfully designed and genuinely useful.

---

## 📄 License

This project is open source and available under the MIT License. See the LICENSE file for details.

---


