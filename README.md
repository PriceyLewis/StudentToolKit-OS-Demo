# Student Toolkit OS

Student Toolkit OS is a local-first Expo app concept for students and early-career users who want one place to manage academics, fitness, habits, career progress, and income goals.

It is built as a portfolio-ready product mock: the goal is to demonstrate product thinking, multi-screen UX, persistent state, and app structure rather than backend scale.

## Overview

The app combines several planning flows into one mobile experience:

- onboarding and profile setup
- a central dashboard with scores, targets, coaching prompts, and quick actions
- revision, gym, hustle, and CV planning screens
- habit tracking with completion history and streaks
- weekly review and analytics views
- local backup, restore, and notification flows

All user data is stored locally on-device with AsyncStorage. There is no account system, no payment flow, no premium tier, and no backend service in the current version.

## Features

### Core product flows

- Dashboard with aggregate performance scoring across academic, fitness, hustle, and career categories
- Performance target tracking with deadlines
- Planner-style screens for revision, gym progress, side-income hustle, and CV building
- Habit management with completion tracking, difficulty weighting, and streak logic
- Weekly review summaries with insight prompts
- Analytics screens that turn activity into a progress narrative

### Product polish

- local-first persistence via React Context + AsyncStorage
- reminder support with Expo Notifications
- export / sharing support for selected planning flows
- backup and restore utilities
- privacy and disclaimer screens included in-app
- all features available for free to every user

## Tech Stack

- Expo
- Expo Router
- React Native
- TypeScript
- AsyncStorage
- Expo Notifications
- React Native Chart Kit

## Running Locally

### Prerequisites

- Node.js 18+
- npm
- Expo-compatible iOS simulator, Android emulator, or Expo Go

### Install

```bash
npm install
```

### Start the app

```bash
npm start
```

Useful variants:

```bash
npm run android
npm run ios
npm run web
```

### Quality checks

```bash
npm run lint
npm run typecheck
```

## Project Structure

```text
app/         Expo Router routes and screen entry points
context/     app-wide state, profile data, performance data, habits, notifications, theme
src/screens/ larger screen implementations such as analytics, habits, and weekly review
src/utils/   persistence, backup, notification, and review helpers
components/  reusable UI and visualization components
docs/        privacy, terms, release notes, QA, and demo materials
```

## Current Positioning

This repository is best presented as:

- a polished mobile product concept
- a local-first state architecture example
- a portfolio project showing end-to-end UX scope across multiple connected flows

It is not currently a production SaaS app. Missing production pieces include:

- authentication
- cloud sync
- backend data storage
- server-side analytics
- automated test coverage for core flows

## Documentation

Additional project material lives in [`docs/`](./docs):

- `docs/demo-script.md`
- `docs/privacy-policy.md`
- `docs/terms-of-use.md`
- `docs/release-pipeline-checklist.md`
- `docs/stage6-offline-qa-checklist.md`
- `docs/store-listing-compliance-checklist.md`

## Suggested Next Steps

If this project were taken beyond portfolio/demo scope, the next sensible upgrades would be:

- authentication and cross-device sync
- calendar integration and smarter reminders
- stronger analytics and forecasting
- a hardened design system
- automated tests around persistence and planner workflows

## License / Use

No license file is currently included in this repository. If you plan to publish or share the project more broadly, add an explicit license so usage terms are clear.
