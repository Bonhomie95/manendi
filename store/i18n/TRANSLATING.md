# Translating Manendi

Manendi is for people who live in the United States on a visa or a green card: students, workers and their families.
It counts down every date that keeps someone in legal status (I-94, OPT, work permits, H-1B, green card renewal,
citizenship) and explains each one in plain words. Readers deal with US immigration paperwork in English, so official
names stay in English; everything around them is in their language.

## Files

For a language tag `T` (see `languages.json`):
- `app/src/i18n/T.json`: every app string. Same keys as `app/src/i18n/en.json`, in the same order.
- `store/i18n/T.json`: the App Store and Google Play listing text. Same structure as `store/i18n/en.json`.

To see where a string appears, search its key under `app/src` (for example `grep -rn "'welcome.slide1.title'" app/src`).

## Rules

- **Placeholders** like `{name}` stay exactly as written; you may move them around the sentence.
- **Plurals** use ICU syntax, `{n, plural, one {# day} other {# days}}`, where `#` is the number. Keep the variable
  name and the word `plural`, translate inside the braces, and give every category your language needs (listed in
  `languages.json` terms by `node scripts/i18n-check.mjs`). You may add a plural block to a placeholder that holds a
  count, such as `{left}` or `{days}`, when your grammar needs one. A language with only `other` uses one `other {…}`
  branch, or just the placeholder.
- **Keep these exactly as written:** Manendi, Manendi Plus, Face ID, Apple, Google. Also US status, form and agency
  names: I-94, I-20, DS-2019, I-765, I-539, I-485, I-131, I-90, I-751, I-829, N-400, EB-2, EB-5, F-1, J-1, H-1B, H-4,
  L-1, L-2, O-1, TN, E-3, B-1/B-2, OPT, STEM OPT, STEM, EAD, D/S, TPS, USCIS, DSO, SEVIS and CBP. Example receipt
  numbers (IOE0912345678), domains and URLs stay as they are. "Visa Bulletin" and "Federal Register" stay in English;
  add a short translation in parentheses only where it really helps.
- **Meaning over words.** Match the English tone: plain, calm, direct, short sentences. Use the register a trusted
  modern app uses for personal legal or money matters in your language, such as the form of "you" a good banking app
  uses, and keep it consistent. Use the terms speakers of your language in the US actually use for "green card",
  "work permit", "grace period" and so on, the same way everywhere.
- **Never change facts.** Numbers, deadlines and conditions ("up to 6 months", "within 10 days", "90 days before")
  stay exactly as in English. This is information people act on.
- **Fit the space.** Buttons, tab names and labels must stay short, ideally within 130% of the English length.
- `status.*`: keep the codes (F-1, H-1B…) and translate only the word ones ("Green card pending", "Green card",
  "Conditional green card", "Other"). `server.*` are server error messages, `push.caseUpdate` is a notification
  title, and `native.*` are the iOS permission prompts.

## Store listing

- `apple.name` and `play.title` start with `Manendi: ` and fit in 30 characters (your version of "Visa Status Clock").
- Limits, in characters: `apple.subtitle` 30, `apple.promotionalText` 170, `apple.keywords` 100, the Apple
  subscription names 30, `apple.subscriptionDescription` 55, `play.shortDescription` 80, `play.releaseNotes` 500, the
  Play subscription titles 55, each `play.subscriptionBenefits` item 40, `play.subscriptionDescription` 80.
- In the descriptions keep every URL, both prices ($9.99, $79.99) and the list of official domains. "In plain
  English" becomes "in plain language", since the app now speaks the reader's language.
- `apple.keywords`: comma-separated, no spaces after commas, at most 100 characters. Use the words people would really
  search for in your language to find a US visa or immigration status tracker, plus useful codes such as OPT, H1B and
  I-94. Don't repeat words already in the app name.

## Check

From `app/`: `node scripts/i18n-check.mjs T` must report 0 errors. `VERBOSE=1` also lists strings left identical to
English; translate those unless they're names or codes.

## Notes on specific keys

- `dateField.placeholder` ("MM/DD/YYYY"): you may translate the letters, but keep month, day, year in that order;
  the field reads US-format dates from US documents.
- `welcome.slide2.body` and the store descriptions say "plain English": write "plain language".
- `backup.note` names the Family tab: use the same word as `tabs.family`.
- `meta.lock.android` ("your screen lock") is a noun phrase dropped into other sentences; keep it a phrase that fits.
- `brand.stamp.*` are decorative passport stamps on the welcome art.
- `intro.motto.*` are short mottos under the logo at launch; keep them short.
