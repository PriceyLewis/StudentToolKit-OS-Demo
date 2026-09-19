# Recruiter Demo Script

## Positioning

Student Toolkit OS is a local-first React Native / Expo portfolio product that turns academic planning, habits, fitness, project-building and career development into one weekly operating system.

The fastest way to review it is the **Interactive Portfolio Demo**. It loads realistic sample history and deadlines immediately, without requiring an account or setup.

## 60–90 second walkthrough

### 1. Start with demo mode — 10 seconds

From onboarding, choose **Try Interactive Demo**.

Explain:

> The demo uses realistic local sample data so a reviewer can see the finished product immediately. If a real local workspace exists, it is snapshotted and restored when demo mode ends.

### 2. Today command centre — 15 seconds

On the dashboard, show:

- overall performance;
- the three ranked next moves;
- current habit progress;
- nearest deadline;
- quick links into revision, habits and weekly review.

Talking point: the dashboard is designed to answer “what should I do next?” rather than only displaying scores.

### 3. Adaptive revision scheduler — 20 seconds

Open **Academic Performance**.

Show the exam date, weekly hours, available days and confidence controls. Change one subject from **High** to **Low** confidence and point out that its share of revision time increases.

Talking point: planning logic is isolated in a pure module and regression-tested independently of the UI.

### 4. Habits + analytics — 15 seconds

Return to the dashboard, complete a habit, then open Analytics.

Show:

- weighted habit consistency;
- streak history;
- calendar-based 14/30-day coverage;
- current-month performance insight.

Talking point: date metrics use actual calendar windows, so stale or duplicate records do not inflate consistency.

### 5. Recovery and engineering quality — 15 seconds

Open Settings & Info.

Show:

- JSON backup / restore;
- reset demo sample data;
- exit demo and restore previous local data.

Explain that backup imports validate recognised keys and nested JSON, and a failed storage write triggers rollback.

## Engineering talking points

- React Native + Expo Router + TypeScript
- React Context with AsyncStorage persistence
- deterministic domain logic separated from device APIs
- transactional backup restore with rollback
- isolated demo mode with workspace restoration
- unit regression tests using Node's built-in runner
- GitHub Actions for lint, typecheck, tests and Expo web export
- dashboard presentation split into reusable modules

## If asked what would come next

The production-oriented next steps would be optional authentication and cross-device sync, real calendar integration, a formal shared component system and device-level end-to-end testing.
