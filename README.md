# Student Toolkit OS

Student Toolkit OS is a local-first React Native / Expo portfolio application for students and early-career users who want one place to manage academics, habits, fitness, career progress and personal goals.

The project is deliberately positioned as a **portfolio-ready mobile product**, not a production SaaS. It demonstrates multi-screen UX, shared application state, local persistence, recoverability and product thinking without requiring a hosted backend.

## Why This Project Is In My Portfolio

This project demonstrates that I can take a broad product idea and turn it into a coherent mobile application rather than a collection of disconnected screens. The main engineering focus is keeping multiple feature areas consistent while sharing persisted state safely across the app.

## Core Product Flows

- Onboarding and local profile setup
- Central dashboard with academic, fitness, hustle and career progress
- Revision planning and study targets
- Gym and fitness tracking
- Side-income / hustle planning
- CV building and career progress
- Habit tracking with completion history, weighting and streaks
- Weekly review and analytics views
- Local notifications and reminders
- Backup, restore, export and sharing flows

## Technical Highlights

- **React Native + Expo Router** for a cross-platform mobile application structure
- **TypeScript** across application code
- **React Context** for shared app-level state
- **AsyncStorage** for local-first persistence across app restarts
- **Expo Notifications** for reminder flows
- **React Native Chart Kit** for visual progress reporting
- Defensive backup / restore validation with rollback protection if a restore fails
- Responsive product flows designed to remain useful without an account or internet connection

## Quality & Verification

GitHub Actions runs the core static quality checks on pushes and pull requests:

```bash
npm run lint
npm run typecheck
```

These checks catch lint regressions and TypeScript errors before changes reach the demo branch.

The project does not currently claim full automated end-to-end mobile test coverage. The most valuable future testing upgrade would be automated coverage around persistence, backup / restore and the main planner journeys.

## Running Locally

### Prerequisites

- Node.js 18+
- npm
- Expo-compatible iOS simulator, Android emulator, web browser or Expo Go

### Install

```bash
npm install
```

### Start

```bash
npm start
```

Useful variants:

```bash
npm run android
npm run ios
npm run web
```

## Project Structure

```text
app/         Expo Router routes and screen entry points
context/     app-wide state, profile, performance, habits, notifications and theme
src/screens/ larger feature screens such as analytics, habits and weekly review
src/utils/   persistence, backup, notification and review helpers
components/  reusable UI and visualisation components
docs/        demo, privacy, QA and release documentation
```

## Product Scope

All current user data is stored locally on-device. There is no production account service, payment flow or hosted backend in this portfolio version.

That is intentional: the repository is designed to make the mobile architecture and UX easy for a recruiter or reviewer to inspect without needing external services or credentials.

## Documentation

Additional project material lives in [`docs/`](./docs), including:

- demo walkthrough material
- privacy and terms drafts
- offline QA checks
- release / store-readiness checklists

## If Taken Further

The next production-oriented upgrades would be:

- authentication and optional cross-device sync
- calendar integration and smarter reminders
- stronger analytics and forecasting
- a more formal reusable design system
- automated end-to-end tests for critical flows

## License / Use

No license is currently included. The repository is published as portfolio source for review rather than as a reusable open-source package.
