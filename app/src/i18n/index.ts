// Every shipped language except English (en.json), loaded on first use. Keep in sync with app.json `locales` and
// the expo-localization plugin's `supportedLocales`.
export const DICTS: Record<string, () => Record<string, string>> = {};
