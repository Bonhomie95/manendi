# Manendi

Every date that keeps you in status, counted. A local-first immigration companion for iOS & Android.

```
app/     Expo (SDK 58) app — Expo Router, Reanimated 4, native tabs. Status data lives on the phone.
server/  Node API (stdlib http + MongoDB) — USCIS case watch, policy radar, Manendi Plus.
```

## Run

```bash
cd server && cp .env.example .env && npm install && npm start   # API on :4100 (USCIS_MOCK=1 → test statuses)
cd app && npm install && npm run ios        # or: npm run android
```

Swap `MONGODB_URI` in `server/.env` for your Atlas string to go live — nothing else changes.
Point devices/production at the API with `EXPO_PUBLIC_API_URL`.

## Checks

```bash
cd app && npm test && npm run typecheck && npx expo lint
cd server && npm test && npm run smoke      # smoke needs the API running
```

## How it works

- **Rules engine** — `app/src/lib/rules.ts`: I-94, passport, visa stamp, EAD renewal window, OPT/STEM OPT
  unemployment days, F-1/J-1 grace periods, the 60-day grace period after a job ends, H-1B six years plus
  recaptured days, I-90, I-751, N-400 early filing, physical presence (travel budget) and continuous residence.
  Every clock links its official source. Includes DHS's fixed-admission rule for F/J students (effective
  Sept 15, 2026): 30-day departure period, D/S capped at Sept 15, 2030. Tests: `rules.test.ts`.
- **Local-first** — people, dates, jobs, trips and vault photos stay on the device (one JSON file + the vault
  folder; device backups carry them). No accounts: a random device key in the keychain.
- **Server** — holds only watched receipt numbers, their labels and statuses, a push token and the plan.
  Erased from the app (Family → Erase my server data); idle devices are dropped after a year.
- **Case status** — USCIS's official Case Status API. Sandbox keys work today; production access needs the
  USCIS demo (booked into 2027). Until then the app links egov.uscis.gov and logs updates by hand; watched
  cases light up on their own once production keys are set.
- **Radar** — the Federal Register API (rules, proposed rules, notices, presidential documents), tagged by
  visa type and cached hourly.

## Brand

`npm run brand` (in `app/`) regenerates every icon and splash asset from the vector mark: a seal with a
quarter open (the clock still running), a doorway, and a dot — you, inside, staying. iOS ships an Icon
Composer `.icon` (Liquid Glass); Android ships adaptive + themed (monochrome) icons.
