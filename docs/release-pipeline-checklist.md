# Production Release Pipeline (Expo + EAS)

## 1) Versioning
Set these before each release:
- `expo.version` (user-facing app version, e.g. `1.0.1`)
- `expo.ios.buildNumber` (string, increment each iOS build)
- `expo.android.versionCode` (number, increment each Android build)

## 2) Assets and production flags
- Final app icon and splash assets are set.
- Remove debug/dev-only logs and feature flags.
- Confirm notifications, backup/restore, and policy links are production-safe.

## 3) Build profiles
Use `eas.json` profiles:
- `development`: local/dev-client usage
- `preview`: internal testers
- `production`: store-ready binaries

## 4) Internal testing first
- Google Play: Internal testing track
- iOS: TestFlight internal testers

## 5) Device QA (must pass)
- Fresh install -> onboarding -> dashboard
- App works offline
- Restart phone and app still works
- Backup export/restore works
- No blank screens on corrupted local data

## 6) Build and submit commands
- `eas build --platform android --profile preview`
- `eas build --platform ios --profile preview`
- `eas build --platform android --profile production`
- `eas build --platform ios --profile production`

Optional submit:
- `eas submit -p android --latest`
- `eas submit -p ios --latest`
