# Manendi — launch kit

Bundle ID / package: `dev.bonhomieinc.manendi` (Bonhomie LLC, same Apple team and Play organization as Ambodo).

## Ship it

### 1. The API
- Render → New → Blueprint → this repo (`render.yaml`). Fill the secrets: `MONGODB_URI` (Atlas), `SUPPORT_EMAIL`,
  `LEGAL_NAME`, `LEGAL_ADDRESS`, `REVENUECAT_SECRET_KEY`. Leave the `USCIS_*` keys empty until step 2.
- The store pages are served by the API: `/privacy`, `/terms`, `/support`, `/erase`.

### 2. USCIS Case Status API (live case status)
1. Sign up at developer.uscis.gov → create a developer app → request the Case Status API → sandbox keys.
2. Sandbox: set `USCIS_BASE=https://api-int.uscis.gov` + the sandbox ID/secret to exercise real calls (test receipts only).
3. Production: email USCIS for production access (Form G-1595 + a live demo; slots were booked through Feb 2027),
   then set the production base URL and keys. Until then the app stays fully useful: cases are saved, checked
   on egov.uscis.gov and logged by hand, and they light up automatically once keys are in.
- USCIS terms: only users' own receipts (with consent) — the app never scans "neighbor" numbers.

### 3. Subscriptions (Manendi Plus)
- RevenueCat project "Manendi": entitlement **`plus`**; offering `default` with monthly + annual packages.
- Products (both stores): `manendi.plus.monthly` $9.99 · `manendi.plus.annual` $79.99, 1 subscription group.
- Put the public SDK keys in `app/eas.json` → production env: `EXPO_PUBLIC_RC_IOS_KEY` (appl_…),
  `EXPO_PUBLIC_RC_ANDROID_KEY` (goog_…). Store builds refuse to build without them (app.config.ts).
- Play: add the `play-console-api-access` service account to Manendi under Users and permissions (needed by
  RevenueCat and `eas submit`).

### 4. Build settings (EAS)
- `cd app && npx eas-cli@latest init` — creates the EAS project id (push notifications need it).
- Push for case alerts: `npx eas-cli@latest credentials` → APNs key (iOS) and FCM V1 key (Android).

### 5. Build and submit
```bash
cd app
npx eas-cli@latest build -p ios --profile production
npx eas-cli@latest build -p android --profile production
npx eas-cli@latest submit -p ios --profile production
npx eas-cli@latest submit -p android --profile production
```

### 6. App Review notes (both stores)
> No account needed. Tap Start, enter a first name, pick a status (for example H-1B) and add any dates.
> Clocks appear on the Status tab; tap one for its official source. Cases: add any receipt number in the format
> IOE0912345678 (live USCIS status switches on after USCIS grants production API access; until then cases are
> checked on egov.uscis.gov and logged by hand). Manendi Plus can be bought with a sandbox/test account.
> Manendi provides information, not legal advice, and files nothing with any agency.

## App Store listing
- **Name:** Manendi: Visa Status Clock
- **Subtitle:** Every date that keeps you here
- **Promotional text:** Rules just changed for F-1 students, work permits and H-1B fees. Manendi recounts your dates for you.
- **Keywords:** visa,status,I-94,OPT,STEM,H1B,EAD,green card,USCIS,case tracker,citizenship,N-400,immigration
- **Category:** Productivity (secondary: Travel) · **Age rating:** 4+
- **Description:**
  Manendi counts down every date that keeps you in status — and tells you, in plain English, what each one means.

  • Your status clock: I-94, passport, visa stamp, work permit renewal windows, OPT unemployment days, grace periods,
    H-1B six-year limit, green card renewal, removing conditions and your citizenship filing date.
  • Every case, one glance: your family’s USCIS cases with each step explained.
  • Radar: new rules, fees and notices that touch your visa, straight from the Federal Register.
  • Travel: log trips and see your citizenship travel budget before you book.
  • Private by design: no account, and your status, dates, trips and documents stay on your phone.

  Manendi Plus adds your whole household, unlimited watched cases with change alerts, the citizenship travel budget,
  the H-1B limit and green card queue, a Face ID document vault, and a status report PDF.

  Manendi gives information, not legal advice. Every clock links its official source.
- **Privacy “nutrition” answers:** Data Not Linked to You — User Content › Other (receipt numbers you watch),
  Identifiers › Device ID (random device key), Purchases. No tracking. No data used for ads.

## Google Play listing
- **Short description:** Every date that keeps you in status: I-94, OPT, EAD, H-1B, green card, citizenship.
- **Data safety:** collects Device or other IDs (random key), App activity › Other user-generated content (receipt
  numbers), Purchase history; all for app functionality, encrypted in transit, not shared, deletable in the app or
  at `/erase`. No data collected from status, dates, trips or documents (they never leave the device).
- **Content rating:** no objectionable content · **Target audience:** 18+.

## Store art
Screens worth framing: Status (hero clock), Cases, Radar, Travel (budget), Plan. Generate raw shots from the
iOS 6.9" simulator and an Android phone, then frame them like Ambodo's `scripts/store-art.py`.
