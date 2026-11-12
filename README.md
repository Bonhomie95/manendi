# Manendi

Every date that keeps you in status, counted. A local-first immigration companion for iOS & Android.

```
app/     Expo (SDK 58) app — Expo Router, Reanimated 4, native tabs. Status data lives on the phone.
server/  Node API (stdlib http + MongoDB) — USCIS case watch, policy radar, Manendi Plus.
keepalive/  Zero-dependency pinger that keeps the free Render API awake (5–10 min, random).
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
node --test keepalive/keepalive.test.mjs
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
- **Official pages** — USCIS, State, CBP and Federal Register links open over the app (Safari View Controller /
  a Chrome Custom Tab in Manendi's own task) and close back to where you were.
- **Motion** — every launch deals one of 13 logo choreographies from a shuffled deck (none repeats until all have
  played), with 7 letter styles, an occasional motto seal, 8 palettes, 5 backdrops and 8 taglines. Lists glide in
  and re-flow, numbers roll, and the Status hero is a swipeable deck of your most pressing dates.

## Render's free plan

A free instance sleeps after 15 idle minutes and takes about a minute to wake. The API pings itself every 5–10
minutes, and `keepalive/` (run anywhere, or by the `keep-awake` GitHub Action) wakes it if it ever falls asleep.
One free service awake 24/7 uses ~744 of the workspace's 750 free hours a month, and Render suspends **every**
free service in the workspace when they run out. Set `KEEPALIVE_HOURS` (UTC, e.g. `12-04`) on the service and as a
repo variable to share the hours with another app, or move the live one to a paid instance (no sleep, no budget).

## Brand

`npm run brand` (in `app/`) regenerates every icon and splash asset from the vector mark: a seal with a
quarter open (the clock still running), a doorway, and a dot — you, inside, staying. iOS ships an Icon
Composer `.icon` (Liquid Glass); Android ships adaptive + themed (monochrome) icons.
