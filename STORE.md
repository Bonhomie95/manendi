# Manendi — launch kit

Bundle ID / package: `dev.bonhomieinc.manendi` (Bonhomie LLC, same Apple team and Play organization as Ambodo).

## Ship it

### 1. The API
- Render → New → Blueprint → this repo (`render.yaml`). Fill the secrets: `MONGODB_URI` (Atlas), `SUPPORT_EMAIL`,
  `LEGAL_NAME`, `LEGAL_ADDRESS`, `REVENUECAT_SECRET_KEY`. Sandbox `USCIS_*` keys are safe here (step 2).
- The store pages are served by the API (`/privacy`, `/terms`, `/support`, `/erase`) and copied to an always-on static
  site, **https://manendi.onrender.com**, rebuilt on every push (`site/build.mjs`). Use the static URLs in both listings:
  privacy `https://manendi.onrender.com/privacy`, support `https://manendi.onrender.com/support`.

### 2. USCIS Case Status API (live case status)
Official path: [developer.uscis.gov → Production access](https://developer.uscis.gov/get-started/production-access).
1. **Sandbox (done):** developer account + a developer app with the Case Status API → sandbox ID/secret.
2. **Traffic:** USCIS wants a *minimum of 5 consecutive calendar days* of sandbox API traffic with both success and
   error responses (200 and 4xx). With the sandbox keys on Render (base `https://api-int.uscis.gov`), the production
   API drills the sandbox hourly by itself (test receipt `EAC9999103402` → 200, `EAC0000000000` → 4xx) and never shows
   sandbox data to users. The sandbox answers Mon–Fri 7am–8pm Eastern; check the `uscis sandbox drill:` log lines.
3. **Request:** after a full Mon–Fri run, email USCIS Torch API Developer Support (address on the
   [request page](https://developer.uscis.gov/get-started/production-access/request)): app name, that users look up
   only their own receipts with consent, and that sandbox integration is implemented and tested.
4. **Affidavit:** USCIS replies with the Developer Portal Affidavit Form: print it, wet-sign it, send it back.
5. **Demo ID + demo:** they issue a 4-digit demo ID to add to API request headers, a scheduler link and the USCIS API
   Demo Checklist. Demo slots were booked through February 2027 (next: March 2027).
6. **Go live:** after the demo, USCIS shares the production token URL, keys and quotas. Set `USCIS_BASE`,
   `USCIS_CLIENT_ID` and `USCIS_CLIENT_SECRET` on Render: watched cases light up and change alerts start.
- USCIS terms: only users' own receipts (with consent) — the app never scans "neighbor" numbers.

### 3. Subscriptions (Manendi Plus)
- RevenueCat project **Manendi** (`9f18faf8`, set up 2026-11-12): apps Manendi (App Store) and Manendi (Play Store),
  entitlement **`plus`**, current offering `default` with `$rc_monthly` + `$rc_annual`. Play IDs are
  `manendi.plus.monthly:monthly` and `manendi.plus.annual:annual` (subscription:base plan). The App Store app reuses
  the team's in-app purchase key (M7GJU7NSMS); the Play app still needs the service-account JSON (**you**).
- Products (both stores): `manendi.plus.monthly` $9.99 · `manendi.plus.annual` $79.99, 1 subscription group.
- Public SDK keys are in `app/eas.json` → production env (`EXPO_PUBLIC_RC_IOS_KEY`, `EXPO_PUBLIC_RC_ANDROID_KEY`).
- Play: add the `play-console-api-access` service account to Manendi under Users and permissions (needed by
  RevenueCat and `eas submit`).

### 4. Build settings (EAS)
- EAS project: **@bonhomie95/manendi** (`extra.eas.projectId` in app.json, created 2026-11-12).
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
  • Every case, one glance: your family’s USCIS receipt numbers in one place, each step explained in plain English.
  • Radar: new rules, fees and notices that touch your visa, straight from the Federal Register.
  • Travel: log trips and see your citizenship travel budget before you book.
  • Private by design: no account, and your status, dates, trips and documents stay on your phone.

  Manendi Plus adds your whole household, unlimited cases, the citizenship travel budget,
  the H-1B limit and green card queue, a Face ID document vault, and a status report PDF.

  Manendi gives information, not legal advice. Every clock links its official source.
- **Privacy “nutrition” answers:** Data Not Linked to You — User Content › Other (receipt numbers you watch),
  Identifiers › Device ID (random device key), Purchases. No tracking. No data used for ads.

## Google Play listing
- **Short description:** Every date that keeps you in status: I-94, OPT, EAD, H-1B, green card, citizenship.
- **Data safety:** collects Device or other IDs (random key), App activity › Other user-generated content (receipt
  numbers), Purchase history; all for app functionality, encrypted in transit, not shared, deletable in the app or
  at https://manendi.onrender.com/erase. No data collected from status, dates, trips or documents (they never leave the device).
- **Content rating:** no objectionable content · **Target audience:** 18+.

## Store art
Ready in `store/` (regenerate: `cd app && python3 scripts/store-art.py <raw-shots-dir>`):
- `store/ios/01–06-*.jpg`: App Store 6.9" (1320×2868). The app is iPhone-only, so no iPad set is needed.
- `store/android/01–06-*.jpg`: Play phone (1080×1920), `store/play-feature-graphic.png` (1024×500),
  `store/play-icon-512.png`.
- Order: Status · Family · clock detail · Travel · Cases · Radar. Raw shots come from a demo household (Ada H-1B,
  Sam H-4 with a work permit, Mia H-4) at 9:41 with live USCIS off, exactly as production behaves today.

## Publishing session (you signed in, Claude drives the browser pane)
Claude never types passwords or codes, ticks agreements or declarations, uploads files, or pastes secret keys.
Those steps are marked **you**.
1. **RevenueCat:** project "Manendi" → iOS + Android apps (`dev.bonhomieinc.manendi`) → products, entitlement
   `plus`, offering `default` (§3). Claude puts the public SDK keys in `app/eas.json`. **You:** upload the App Store
   in-app purchase key and the Play service-account JSON, and paste the secret key into Render as `REVENUECAT_SECRET_KEY`.
2. **App Store Connect:** new app (Manendi: Visa Status Clock, bundle `dev.bonhomieinc.manendi`), subscription group
   "Manendi Plus" with both products, listing text, URLs (privacy/support on manendi.onrender.com), review notes (§6).
   **You:** Paid Apps agreement/tax/banking if not done, App Privacy answers (above), age rating, export compliance
   (standard HTTPS encryption only), and uploading `store/ios/*`.
3. **Google Play Console:** create the app, store listing text, subscriptions, countries, app access notes.
   **You:** the creation declarations, Data safety and content rating (answers above), ads (none), target audience
   (18+), uploading `store/android/*` and the two `store/play-*` graphics.
4. **Builds:** `eas build -p android --profile production`, then `-p ios` (**you** sign in to Apple once when EAS
   asks), then `eas submit` for both; Claude attaches the builds and submits them for review.

### Where it stands (2026-11-12)
**App Store Connect**: app `6833923129` (SKU `manendi-ios`), subscription group "Manendi Plus" (`22572258`):
`manendi.plus.annual` (Apple ID 6833923717, $79.99, level 1) and `manendi.plus.monthly` (6833924804, $9.99, level 2),
both worldwide with display names, descriptions and review notes. App Information has the subtitle, Productivity /
Travel categories and the privacy URL. Pricing is Free, in 174 regions (China mainland is off because it needs an ICP
filing). Mac and Vision Pro distribution are off (the app is iPhone-only and untested there). Version 1.0 has the
description (with subscription terms and Terms/Privacy links), keywords, promo text, support URL, copyright
"2026 Bonhomie LLC", the review notes, no sign-in, and automatic release. Export compliance: `ITSAppUsesNonExemptEncryption`
is false in app.json.
**You, in App Store Connect:**
- App Privacy → Get Started (answers above) → Publish.
- App Information → Content Rights ("No, it doesn't contain third-party content") and Age Rating (all "None"/"No" → 4+).
- Version 1.0 → upload `store/ios/01–06` (6.9" display) and fill App Review contact (name, phone, email).
- Each subscription → Review Information → Screenshot: upload `store/review/ios-subscription-review.png`.
- Business → Paid Apps agreement, tax and banking, if not already active (subscriptions can't sell without it).
- Optional: App Information → App Store Server Notifications → production URL from RevenueCat
  (Manendi → App Store app → "Apple Server to Server notification URL"), for faster renewal updates.

**Google Play**: app `4974080454506156944` (organization account, so no 12-tester rule). Store listing text is a
saved draft, category Productivity, contact `support@bonhomieinc.dev` + https://manendi.onrender.com, privacy policy
URL set, production targets 178 countries.
**You, in Play Console:**
- Store listing → upload `store/play-icon-512.png`, `store/play-feature-graphic.png`, `store/android/01–06`; Save.
- App content declarations: Ads **No** · Advertising ID **No** · Government app **No** · Financial features **none** ·
  Health **none** · Target audience **18+** · Content rating questionnaire (the utility / productivity / "other" category, every
  answer No) · Data safety (answers above) · Trader status **trader**, Terms of Service
  https://manendi.onrender.com/terms.
- First upload: Test and release → Production → Create new release → upload the `.aab` from EAS (Google requires the
  first upload by hand; `eas submit` works after that).
- Then (Claude): subscriptions `manendi.plus.monthly` (base plan `monthly`) and `manendi.plus.annual` (base plan
  `annual`), a promo code for reviewers, and the Sign in details: "Yes, restricted": the Plus features need the
  subscription (promo code given), the vault opens with the device's own screen lock.
