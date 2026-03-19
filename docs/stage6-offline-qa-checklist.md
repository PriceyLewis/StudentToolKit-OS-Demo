# Stage 6 Offline-First QA Checklist

## Core flows
- Fresh install -> onboarding -> dashboard
- Update scores in each planner -> dashboard updates + history logs
- Habit tick -> streak and completion updates
- Weekly Review works with sparse data
- Analytics charts load

## Hard store-killer checks
- App works fully offline
- Phone restart does not break local data
- Corrupted storage fallback does not create blank screens
- Reset Data behavior is correct (does not wipe Pro unless chosen)

## Purchase and restore
- Buy Pro once
- Close app and reopen -> still Pro
- Reinstall and use restore purchase -> Pro returns

## Notifications
- Daily notification fires at expected local time
- Weekly review reminder fires correctly
- Tapping notification routes to expected screen

## UX checks
- Empty states are clear and actionable
- Pro-locked screens explain what is locked and why
- Privacy Policy and Terms links are reachable from Settings
