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
> Sign-in is optional (Family tab → Back up your household, or Restore my household on the welcome screen); delete
> the account from the Family tab → tap the account → Delete account.
> Clocks appear on the Status tab; tap one for its official source. Cases: add any receipt number in the format
> IOE0912345678 (live USCIS status switches on after USCIS grants production API access; until then cases are
> checked on egov.uscis.gov and logged by hand). Manendi Plus can be bought with a sandbox/test account.
> Manendi provides information, not legal advice, and files nothing with any agency.

**Play's review code.** Play reviewers can't make purchases, so on Android the paywall has "Have a code?" under
Restore purchases. The code is `REVIEW_CODE` in `server/.env` and on Render, and it unlocks Plus for 30 days on that
device. It goes in Play Console → App content → Sign in details → "Manendi Plus review code" → Password. To change
it, update Render and that field together. iOS never shows the field, because Apple bans unlock codes (guideline
3.1.1) and Apple's reviewers buy in the sandbox.

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
  • Private by design: no account needed. Sign in with Apple or Google only if you want a backup for a new phone.
    Document photos never leave yours.

  Manendi Plus adds your whole household, up to 25 watched cases, the citizenship travel budget,
  the H-1B limit and green card queue, a Face ID document vault, and a status report PDF.

  Manendi gives information, not legal advice. Every clock links its official source.
- **Privacy “nutrition” answers** (sign-in is optional, but what it can collect must be declared): **Data Linked to
  You**, all for App Functionality: Contact Info › Name and Email Address (only if you sign in), User Content › Other
  User Content (receipt numbers you watch, and the household backup if you sign in), Identifiers › User ID (the
  account) and Device ID (random device key), Purchases › Purchase History. No tracking. Nothing used for ads.

## Google Play listing
- **Short description:** Every date that keeps you in status: I-94, OPT, EAD, H-1B, green card and more.
- **Full description:** the App Store description with three Android changes:
  - Google sign-in only.
  - "Up to 25 watched cases", because the server caps Plus at 25.
  - A vault "behind your screen lock".
  It ends with a not-affiliated line and the official sources (uscis.gov, egov.uscis.gov, federalregister.gov,
  travel.state.gov, i94.cbp.dhs.gov), which Play's policy requires for apps that show government information.
- **Data safety:** collects Personal info › Name, Email address and Other info (the household backup: statuses,
  dates, trips) — optional, only when someone signs in, for Account management and App functionality; Device or
  other IDs (random key); App activity › Other user-generated content (receipt numbers); Financial info › Purchase
  history. Encrypted in transit, not shared, deletable in the app or at https://manendi.onrender.com/erase.
  Account creation: **yes** (Sign in with Google / Apple), delete-account URL https://manendi.onrender.com/erase.
  Document photos are never collected.
- **Content rating:** no objectionable content · **Target audience:** 18+.

## Store art
Ready in `store/` (regenerate: `cd app && python3 scripts/store-art.py <raw-shots-dir>`):
- `store/ios/01–06-*.jpg`: App Store 6.9" (1320×2868, optional slot) and `store/ios-6.3/` (1206×2622, the required
  6.1"/6.3" slot). The app is iPhone-only, so no iPad set is needed.
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

### Where it stands (2026-11-20)
- **Live:** 1.0 on the App Store, 1.0.1 (6) on Google Play.
- **Google Play 1.1.0 (versionCode 8): sent to production review on 2026-11-20.** It has release notes in 49 languages,
  and the 49 store listings and both subscriptions' text are translated too.
- **App Store 1.1.0 (build 13): Waiting for Review since 2026-11-20, releases by itself once approved.** It replaces
  1.0.1, which was withdrawn from review the same day; 1.1.0 includes everything 1.0.1 had. The name, subtitle,
  description, keywords and What's New are in 47 locales.
- **Still English on iOS: the subscription names and descriptions.** Apple refuses new subscription languages while
  an earlier English change ("up to 25") is pending review: "Cannot create new localization, change pending review."
  Once that clears, add the 46 languages, then send them with a `subscriptionSubmissions` POST per plan.
- **Next: 1.1.0, the app and both store listings in 46 languages.** That's every App Store language in our 174
  storefronts, plus English. See "1.1.0" below.
- **Backend, yours to do:**
  - Render `manendi-api`: move to Starter ($7/mo) so it never sleeps, then set Settings → Health Check Path to
    `/health`. On the free plan it sleeps outside 14:00–01:00 UTC, so the first call after that waits for a cold start.
  - MongoDB Atlas: confirm the cluster tier includes backups.
  - USCIS: the sandbox drill completes five weekdays on Fri 2026-11-20. After that, send the production-access email
    (§2, step 3).

### 1.1.0: every language
- **Where the text lives:**
  - `app/src/i18n/<tag>.json` holds the app strings: 637 keys, with `en.json` as the source.
  - `store/i18n/<tag>.json` holds the listing text.
  - `store/i18n/languages.json` maps each language to its App Store and Play locales.
  - `store/i18n/TRANSLATING.md` has the rules.
- **After changing any text:** from `app/`, run `node scripts/i18n-check.mjs` (it must report 0 errors), then
  `node scripts/i18n-sync.mjs`. The sync writes the language index, the iOS permission texts, the app.json locales
  and `server/i18n.json`.
- **Google Play** (done for 1.1.0 on 2026-11-20):
  - Upload the build to production with release notes in every language (`playReleaseNotes()` in
    `store/i18n/push.mjs`).
  - Then run `node store/i18n/push.mjs play` for the 48 listings and both subscriptions' text.
- **App Store** (only one version can be in review, and build 13 is already in App Store Connect): once 1.0.1 has
  left review, run `node store/i18n/push.mjs apple 1.1.0 --submit` with the App Store Connect key in `ASC_KEY_PATH`,
  `ASC_KEY_ID` and `ASC_ISSUER`. In order, it:
  - creates the version and attaches the newest processed 1.1.0 build;
  - sets the English text from `en.json` and copies the review details;
  - fills names, subtitles, descriptions, keywords, What's New and the subscription text in 46 more locales;
  - submits the version for review.
  `--dry` prints the writes without making them.
- **Builds:** this month's free EAS cloud builds are used up until 2026-12-01. Until then, build on this Mac with
  `eas build -p ios|android --profile production --local --output <file>`. Signing credentials and build numbers
  still come from EAS.
  - If another project's local build runs at the same time, its temporary keychain can break the iOS export step.
    The archive in Xcode's Archives folder survives that. Export it with `xcodebuild -exportArchive … -allowProvisioningUpdates`
    and the App Store Connect API key, then upload the .ipa with `eas submit -p ios --path <ipa>`.

### Launch record (2026-11-14)
**App Store: submitted 2026-11-14, Waiting for Review.** Version 1.0 (build 11) went in together with the
"Manendi Plus" group and both subscriptions: `manendi.plus.annual` (6833923717, $79.99) and `manendi.plus.monthly`
(6833924804, $9.99). Apple requires a first subscription to be submitted with a version.
- The app is `6833923129` (SKU `manendi-ios`), Free in 174 regions (not China mainland), and iPhone only.
- Done: App Privacy (published), age rating 4+, content rights, review contact and notes (§6), the required 6.3"
  screenshots (`store/ios-6.3`), subscription review screenshots, and export compliance (no non-exempt encryption).
- **You:** Business → Paid Apps agreement → submit the W-9. The agreement must be **Active** before Apple can approve
  or sell the subscriptions.
- Optional: App Store Server Notifications → the RevenueCat URL, for faster renewal updates.

**Sign-in (Google Cloud project `manendi`)**: consent screen "Manendi" is In production (basic scopes, no
verification needed); OAuth clients: Web (`430359710145-8i6h…`), iOS (`…-liuagfib…`), Android for the local debug
key (`5E:8F:…:F6:25`), the EAS upload key (`A7:49:…:C3:2E`) and Play's app signing key (`15:5A:…:FC:43`,
added 2026-11-14).

**Google Play: every App content declaration is done (2026-11-14).** App `4974080454506156944` is on an
organization account, so the 12-tester rule doesn't apply. The store listing text is saved, it targets 178 countries,
and the answers are:
- Ads No · Advertising ID No · Government No · Financial none · Health none · Target audience 18+.
- Trader status: trader, with https://manendi.onrender.com/terms.
- Sign in details: restricted, entry "Manendi Plus review code" (§6). Sharing it with partner test devices is off.
- Content rating: All other app types; online content Yes (the Federal Register radar); digital purchases Yes;
  everything else No. That gives ESRB Everyone, PEGI 3 and IARC 3+ (Brazil 14+).
- Data safety: the answers above. Accounts are OAuth, and both deletion links go to https://manendi.onrender.com/erase.

Done through the API on 2026-11-14:
- **Build 5** (versionCode 5) uploaded. A draft release "1.0.0 (5)" sits on internal testing and on production.
- **Listing:** text, icon, feature graphic and 6 phone screenshots.
- **Subscriptions** `manendi.plus.monthly:monthly` ($9.99) and `manendi.plus.annual:annual` ($79.99) are active in
  174 regions. Each has a 3-day grace period and is backwards compatible with older billing libraries.
- **Sign-in:** Android OAuth client "Manendi Android (Play app signing)" added, for Play's signing SHA-1
  `15:5A:22:…:FC:43`.
- **Production release** is saved in Publishing overview, ready to send for review.

**Sent for review on 2026-11-14:** the production release, the listing and every declaration (12 changes), with the
review code in Sign in details. Managed publishing is off, so the app goes live by itself once approved; Google says
reviews usually take up to 7 days.

**Optional, for testing on your phone:** Internal testing → Testers → create an email list with your Google account
→ roll out the 1.0.0 (5) draft → open the tester link.

### 1.0.1 (live on Play; in App Store review since 2026-11-19)
Built on EAS on 2026-11-14 from `813c5d1`:
- iOS 1.0.1 (build 12): `64098696-6d2b-4b86-9f87-5286d776739a`
- Android 1.0.1 (build 6): `bb6f0b7c-c069-4f68-8d30-819742cb75e6`

Neither store takes a new version while 1.0 is in review. Once a store approves 1.0, run `eas submit -p ios --id
64098696-6d2b-4b86-9f87-5286d776739a` or `eas submit -p android --id bb6f0b7c-c069-4f68-8d30-819742cb75e6`, then do
that store's steps below.
- **What's in it:**
  - Right after setup, the app offers a one-time "Back up your household?" sheet, with the Apple and Google buttons
    and "Not now" (`app/src/app/backup.tsx`). Already signed in means no offer.
  - Plus now says "up to 25" cases everywhere, to match the server's cap. The old copy said "unlimited".
- **Release notes (both stores):** New: right after setup, you can back up your household with Apple or Google in one
  tap, so a new phone gets everyone back. Still optional. Plus, clearer wording on what Manendi Plus includes.
- **App Store Connect, with version 1.0.1:**
  - In the description, change "unlimited cases" to "up to 25 watched cases" (see the listing above).
  - Set both subscriptions' descriptions to "Household, up to 25 cases, vault and status report." They still say
    "unlimited"; these can't be edited while 1.0 is in review.
- **Google Play:** the listing already says "up to 25". The production release just needs the notes above.
