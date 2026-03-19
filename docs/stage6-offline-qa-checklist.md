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
- Reset Data behavior is correct and clears local app data safely

## Backup and restore
- Export local backup JSON
- Close app and reopen -> local data still loads correctly
- Reset app data, then restore from backup -> expected data returns

## Notifications
- Daily notification fires at expected local time
- Weekly review reminder fires correctly
- Tapping notification routes to expected screen

## UX checks
- Empty states are clear and actionable
- Privacy Policy is reachable in-app
- Privacy Policy and Terms URLs open correctly from the dashboard
