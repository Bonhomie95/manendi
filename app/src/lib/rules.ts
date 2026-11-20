// Manendi's status rules: every date that keeps someone in status, turned into countdowns.
// Pure TS with no imports, so the app and `node --test` run the same file. Wording comes from the caller's `tr`
// (keys in src/i18n/en.json), so every clock reads in the app's language.
// Information, not legal advice — every clock links the official page it comes from.

export type Status =
  | 'F-1' | 'OPT' | 'STEM OPT' | 'J-1' | 'H-1B' | 'H-4' | 'L-1' | 'L-2' | 'O-1' | 'TN' | 'E-3'
  | 'B-1/B-2' | 'Green card pending' | 'Green card' | 'Conditional green card' | 'Other';

export type DateKey =
  | 'passport' | 'i94' | 'visa' | 'ead' | 'programEnd' | 'optStart' | 'optEnd' | 'stemEnd'
  | 'h1bStart' | 'residentSince' | 'cardExpiry' | 'priorityDate';

export type Job = { id: string; employer: string; start: string; end?: string | null };
export type Trip = { id: string; depart: string; return?: string | null; place?: string };

export type Person = {
  id: string;
  name: string;
  relation: 'me' | 'spouse' | 'child' | 'parent' | 'other';
  status: Status;
  nationality?: string;
  dates: Partial<Record<DateKey, string>>;
  ds?: boolean; // the I-94 says "D/S" (duration of status) instead of a date
  jobs: Job[];
  trips: Trip[];
  marriedToCitizen?: boolean; // 3-year citizenship path
  category?: string; // green-card queue, e.g. EB-2
  chargeability?: string; // e.g. India
};

/** Translates a message key (src/i18n/en.json) with its values. 'YYYY-MM-DD' values are dates. */
export type Tr = (key: string, vars?: Record<string, string | number>) => string;

export type Level = 'over' | 'urgent' | 'soon' | 'ok' | 'info';
export type Clock = {
  id: string;
  personId: string;
  title: string;
  note: string; // one plain sentence
  level: Level;
  kind: 'expires' | 'window' | 'counter' | 'milestone' | 'info';
  date?: string; // the date that matters
  days?: number; // today → date (negative = past)
  count?: { used: number; limit: number; unit: 'days' | 'days abroad' };
  progress?: number; // 0..1 of the window still left, for the ring
  source: string; // official page
  plus?: boolean; // Manendi Plus
};

export const SOURCES = {
  i94: 'https://i94.cbp.dhs.gov/',
  visa: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/visa-expiration-date.html',
  passport: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/visa-expiration-date.html',
  ead: 'https://www.uscis.gov/i-765',
  opt: 'https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors/optional-practical-training-opt-for-f-1-students',
  stem: 'https://www.uscis.gov/working-in-the-united-states/students-and-exchange-visitors/optional-practical-training-extension-for-stem-students-stem-opt',
  grace: 'https://www.uscis.gov/working-in-the-united-states/options-for-nonimmigrant-workers-following-termination-of-employment',
  h1b: 'https://www.uscis.gov/working-in-the-united-states/h-1b-specialty-occupations',
  extend: 'https://www.uscis.gov/i-539',
  ap: 'https://www.uscis.gov/i-131',
  i90: 'https://www.uscis.gov/i-90',
  i751: 'https://www.uscis.gov/i-751',
  n400: 'https://www.uscis.gov/citizenship/apply-for-citizenship/early-filing-calculator',
  presence: 'https://www.uscis.gov/policy-manual/volume-12-part-d-chapter-4',
  residence: 'https://www.uscis.gov/policy-manual/volume-12-part-d-chapter-3',
  bulletin: 'https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html',
  j1: 'https://j1visa.state.gov/',
};

// ---------- dates: 'YYYY-MM-DD' strings, counted in UTC so time zones never shift a day ----------
const ms = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / 864e5);
export const shift = (s: string, n: number) => iso(ms(s) + n * 864e5);
export const addYears = (s: string, n: number) => { const [y, m, d] = s.split('-').map(Number); return iso(Date.UTC(y + n, m - 1, d)); };
const min = (a: string, b?: string) => (b && b < a ? b : a);
const max = (a: string, b: string) => (a > b ? a : b);
const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const isDate = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && iso(ms(s)) === s;

/** Full days spent outside the US on a trip, within [from, to]. Departure and return days count as days in the US. */
export function daysAbroad(t: Trip, from: string, to: string) {
  const out = shift(t.depart, 1);
  const back = shift(t.return ?? shift(to, 1), -1); // an open trip runs through `to`
  const a = max(out, from);
  const b = min(back, to);
  return a > b ? 0 : daysBetween(a, b) + 1;
}
export const totalAbroad = (trips: Trip[], from: string, to: string) => trips.reduce((n, t) => n + daysAbroad(t, from, to), 0);

const level = (days: number, urgent: number, soon: number): Level =>
  days < 0 ? 'over' : days <= urgent ? 'urgent' : days <= soon ? 'soon' : 'ok';

export const GREEN: Status[] = ['Green card', 'Conditional green card'];
const WORK: Status[] = ['H-1B', 'L-1', 'O-1', 'TN', 'E-3']; // 60-day grace after a job ends (8 CFR 214.1(l)(2))
const EAD_CLOCK: Status[] = ['H-4', 'L-2', 'Green card pending', 'Other'];
// DHS's fixed-admission rule (91 FR 44976, effective Sept 15, 2026): F-1 students get 30 days after their program or OPT
// ends, down from 60. D/S on that date lasts until the program end date or Sept 15, 2030, whichever comes first.
export const FIXED_ADMISSION = '2026-09-15';
const DS_CAP = '2030-09-15';
const f1Grace = (end: string) => (end >= FIXED_ADMISSION ? 30 : 60);
const EAD_NO_AUTO = '2025-10-30'; // automatic EAD extensions ended for renewals filed from this date

/** Every clock for one person, most pressing first. */
export function clocks(p: Person, today: string, tr: Tr): Clock[] {
  const out: Clock[] = [];
  const d = p.dates;
  const add = (c: Omit<Clock, 'personId' | 'days'>) =>
    out.push({ ...c, personId: p.id, days: c.date ? daysBetween(today, c.date) : undefined });
  const lpr = GREEN.includes(p.status);

  if (d.passport) {
    const n = daysBetween(today, d.passport);
    add({
      id: 'passport', title: tr('clock.passport.title'), kind: 'expires', date: d.passport, source: SOURCES.passport,
      level: level(n, 60, 180), progress: clamp(n / 365),
      note: tr(n < 0 ? 'clock.passport.expired' : n <= 180 ? 'clock.passport.soon' : 'clock.passport.ok'),
    });
  }

  if (!lpr && d.i94 && !p.ds) {
    const n = daysBetween(today, d.i94);
    const visitor = p.status === 'B-1/B-2';
    const work = WORK.includes(p.status);
    add({
      id: 'i94', title: tr('clock.i94.title'), kind: 'expires', date: d.i94, source: SOURCES.i94,
      level: visitor ? level(n, 14, 45) : level(n, 30, 180), progress: clamp(n / 180), // the 6-month extension window
      note: tr(n < 0 ? 'clock.i94.passed' : visitor ? 'clock.i94.visitor' : work ? 'clock.i94.work' : 'clock.i94.other'),
    });
  }

  if (!lpr && d.visa) {
    const n = daysBetween(today, d.visa);
    add({
      id: 'visa', title: tr('clock.visa.title'), kind: 'info', date: d.visa, source: SOURCES.visa, level: 'info',
      note: tr(n < 0 ? 'clock.visa.expired' : 'clock.visa.ok'),
    });
  }

  if (d.ead && EAD_CLOCK.includes(p.status)) {
    const n = daysBetween(today, d.ead);
    const opens = shift(d.ead, -180);
    const o = daysBetween(today, opens);
    if (n < 0) {
      add({ id: 'ead', title: tr('clock.ead.expired.title'), kind: 'expires', date: d.ead, level: 'over', progress: 0, source: SOURCES.ead,
        note: tr('clock.ead.expired') });
    } else if (o > 0) {
      add({ id: 'ead', title: tr('clock.ead.window.title'), kind: 'window', date: opens, level: o <= 30 ? 'soon' : 'ok', progress: clamp(n / 545), source: SOURCES.ead,
        note: tr('clock.ead.window', { date: EAD_NO_AUTO }) });
    } else {
      add({ id: 'ead', title: tr('clock.ead.renew.title'), kind: 'window', date: d.ead, level: n <= 90 ? 'urgent' : 'soon', progress: clamp(n / 180), source: SOURCES.ead,
        note: tr('clock.ead.renew') });
    }
  }

  if ((p.status === 'OPT' || p.status === 'STEM OPT') && d.optStart) {
    const stem = p.status === 'STEM OPT';
    const program = stem ? 'STEM OPT' : 'OPT';
    const end = stem ? d.stemEnd : d.optEnd;
    const limit = stem ? 150 : 90;
    if (today >= d.optStart) {
      const through = end ? min(today, end) : today;
      let used = 0;
      for (let day = d.optStart; day <= through; day = shift(day, 1)) {
        if (!p.jobs.some((j) => j.start <= day && (!j.end || j.end >= day))) used++;
      }
      const left = Math.max(0, limit - used);
      const working = p.jobs.some((j) => j.start <= today && (!j.end || j.end >= today));
      const running = !working && (!end || today <= end);
      add({
        id: 'unemployment', title: tr('clock.unemployment.title', { program }), kind: 'counter',
        count: { used: Math.min(used, limit), limit, unit: 'days' }, progress: left / limit,
        date: running ? shift(today, left) : undefined, source: stem ? SOURCES.stem : SOURCES.opt,
        level: left === 0 ? 'over' : running ? (left <= 30 ? 'urgent' : 'soon') : left <= 30 ? 'soon' : 'ok',
        note: left === 0 ? tr('clock.unemployment.usedUp')
          : running ? tr('clock.unemployment.running', { left })
            : tr(stem ? 'clock.unemployment.pausedStem' : 'clock.unemployment.paused', { left, limit }),
      });
    }
    if (end) {
      const after = today > end;
      const g = f1Grace(end);
      const grace = shift(end, g);
      add({
        id: 'opt-end', title: after ? tr('clock.grace.title', { days: g }) : tr('clock.optEnd.title', { program }), kind: after ? 'window' : 'milestone',
        date: after ? grace : end, source: stem ? SOURCES.stem : SOURCES.opt,
        level: after ? level(daysBetween(today, grace), g, g) : level(daysBetween(today, end), 30, 120),
        progress: after ? clamp(daysBetween(today, grace) / g) : undefined,
        note: after ? tr('clock.optEnd.after') : tr('clock.optEnd.before', { days: g }),
      });
    }
    if (!stem && d.optEnd) {
      const opens = shift(d.optEnd, -90);
      if (today <= d.optEnd) {
        const open = today >= opens;
        add({
          id: 'stem', title: tr('clock.stem.title'), kind: 'window', date: open ? d.optEnd : opens, source: SOURCES.stem,
          level: open ? 'soon' : 'info', progress: open ? clamp(daysBetween(today, d.optEnd) / 90) : undefined,
          note: tr(open ? 'clock.stem.open' : 'clock.stem.later'),
        });
      }
    }
  }

  if (p.status === 'F-1' && d.programEnd) {
    const g = f1Grace(d.programEnd);
    const opens = shift(d.programEnd, -90);
    const closes = shift(d.programEnd, g); // you have to file while your stay is still valid
    if (today <= closes) {
      const open = today >= opens;
      const n = daysBetween(today, closes);
      add({
        id: 'opt-window', title: tr('clock.optWindow.title'), kind: 'window', date: open ? closes : opens, source: SOURCES.opt,
        level: open ? (n <= 21 ? 'urgent' : 'soon') : 'info', progress: open ? clamp(n / 150) : undefined,
        note: open ? tr('clock.optWindow.open') : tr('clock.optWindow.later', { days: g }),
      });
    }
    const grace = shift(d.programEnd, g);
    add({
      id: 'f1-grace', title: today > d.programEnd ? tr('clock.grace.title', { days: g }) : tr('clock.f1.programEnds'), kind: 'milestone',
      date: today > d.programEnd ? grace : d.programEnd, source: SOURCES.opt,
      level: today > d.programEnd ? level(daysBetween(today, grace), g, g) : level(daysBetween(today, d.programEnd), 30, 120),
      note: tr('clock.f1.grace', { days: g }),
    });
  }

  if ((p.status === 'F-1' || p.status === 'J-1') && p.ds && d.programEnd && d.programEnd > DS_CAP) {
    add({
      id: 'ds-cap', title: tr('clock.dsCap.title'), kind: 'milestone', date: DS_CAP, source: SOURCES.extend,
      level: level(daysBetween(today, DS_CAP), 90, 365),
      note: tr('clock.dsCap', { date: DS_CAP }),
    });
  }

  if (p.status === 'J-1' && d.programEnd) {
    const after = today > d.programEnd;
    const grace = shift(d.programEnd, 30);
    add({
      id: 'j1-grace', title: after ? tr('clock.grace.title', { days: 30 }) : tr('clock.j1.programEnds'), kind: 'milestone', source: SOURCES.j1,
      date: after ? grace : d.programEnd, level: after ? level(daysBetween(today, grace), 30, 30) : level(daysBetween(today, d.programEnd), 30, 120),
      note: tr('clock.j1.grace'),
    });
  }

  if (WORK.includes(p.status)) {
    const last = [...p.jobs].sort((a, b) => (a.start < b.start ? 1 : -1))[0];
    if (last?.end && !p.jobs.some((j) => j.start > last.end!)) {
      const graceEnd = min(shift(last.end, 60), d.i94);
      const n = daysBetween(today, graceEnd);
      add({
        id: 'grace', title: tr('clock.grace.title', { days: 60 }), kind: 'window', date: graceEnd, source: SOURCES.grace, progress: clamp(n / 60),
        level: today <= last.end ? 'soon' : n < 0 ? 'over' : 'urgent',
        note: today <= last.end ? tr('clock.grace.jobEnds', { date: last.end }) : tr('clock.grace.running'),
      });
    }
  }

  if (p.status === 'H-1B' && d.h1bStart) {
    const recaptured = totalAbroad(p.trips, d.h1bStart, today);
    const maxOut = shift(addYears(d.h1bStart, 6), recaptured);
    const n = daysBetween(today, maxOut);
    add({
      id: 'h1b-max', title: tr('clock.h1bMax.title'), kind: 'milestone', date: maxOut, source: SOURCES.h1b, plus: true,
      level: n < 0 ? 'info' : n <= 365 ? 'soon' : 'ok', progress: clamp(n / 2190),
      note: tr('clock.h1bMax', { date: d.h1bStart, days: recaptured }),
    });
  }

  if (p.status === 'Green card pending') {
    add({ id: 'ap', title: tr('clock.ap.title'), kind: 'info', level: 'info', source: SOURCES.ap, note: tr('clock.ap') });
  }

  if (p.status === 'Green card' && d.cardExpiry) {
    const n = daysBetween(today, d.cardExpiry);
    const opens = shift(d.cardExpiry, -180);
    const open = today >= opens;
    add({
      id: 'i90', title: tr(open ? 'clock.i90.open.title' : 'clock.i90.later.title'), kind: open ? 'window' : 'milestone',
      date: open ? d.cardExpiry : opens, source: SOURCES.i90, progress: clamp(n / 3650),
      level: n < 0 ? 'over' : open ? (n <= 60 ? 'urgent' : 'soon') : 'ok',
      note: tr(n < 0 ? 'clock.i90.expired' : 'clock.i90.ok'),
    });
  }

  if (p.status === 'Conditional green card' && d.cardExpiry) {
    const n = daysBetween(today, d.cardExpiry);
    const opens = shift(d.cardExpiry, -90);
    const open = today >= opens;
    add({
      id: 'i751', title: tr(open ? 'clock.i751.open.title' : 'clock.i751.later.title'), kind: 'window',
      date: open ? d.cardExpiry : opens, source: SOURCES.i751, progress: clamp(n / 730),
      level: n < 0 ? 'over' : open ? (n <= 30 ? 'urgent' : 'soon') : daysBetween(today, opens) <= 60 ? 'soon' : 'ok',
      note: tr(n < 0 ? 'clock.i751.expired' : 'clock.i751.ok'),
    });
  }

  if (lpr && d.residentSince) {
    const years = p.marriedToCitizen ? 3 : 5;
    const anniversary = addYears(d.residentSince, years);
    const eligible = shift(anniversary, -90);
    const n = daysBetween(today, eligible);
    add({
      id: 'n400', title: tr(n <= 0 ? 'clock.n400.now.title' : 'clock.n400.later.title'), kind: 'milestone', date: eligible,
      source: SOURCES.n400, level: n <= 0 ? 'ok' : n <= 120 ? 'soon' : 'ok', progress: clamp(1 - n / (years * 365)),
      note: n <= 0 ? tr('clock.n400.now') : tr('clock.n400.later', { years }),
    });

    // Physical presence: at least half the statutory period inside the US, counted back from the filing date.
    const periodEnd = max(today, anniversary);
    const periodStart = max(d.residentSince, addYears(periodEnd, -years));
    const periodDays = daysBetween(periodStart, addYears(periodStart, years));
    const required = years === 5 ? 913 : 548;
    const allowed = periodDays - required;
    const used = totalAbroad(p.trips, periodStart, min(today, periodEnd));
    const left = allowed - used;
    add({
      id: 'presence', title: tr('clock.presence.title'), kind: 'counter', plus: true, source: SOURCES.presence,
      count: { used, limit: allowed, unit: 'days abroad' }, progress: clamp(left / allowed),
      level: left < 0 ? 'over' : left < 60 ? 'urgent' : left < 180 ? 'soon' : 'ok',
      note: left < 0 ? tr('clock.presence.over', { days: -left }) : tr('clock.presence.ok', { days: left, date: periodEnd, required }),
    });

    // Continuous residence: a single trip of 6 months or more puts it in doubt; a year or more breaks it.
    for (const t of p.trips) {
      const away = daysAbroad(t, periodStart, today);
      if (away >= 150) {
        add({
          id: `residence-${t.id}`, title: tr(away >= 365 ? 'clock.residence.broken.title' : 'clock.residence.long.title'),
          kind: 'info', source: SOURCES.residence, plus: true, level: away >= 180 ? 'urgent' : 'soon',
          note: tr(away >= 365 ? 'clock.residence.broken' : away >= 180 ? 'clock.residence.atRisk' : 'clock.residence.watch', { days: away }),
        });
      }
    }
  }

  if (d.priorityDate && !lpr) {
    const waited = daysBetween(d.priorityDate, today);
    const extra = [p.category, p.chargeability].filter(Boolean).map((x) => ` · ${x}`).join('');
    add({
      id: 'queue', title: tr('clock.queue.title'), kind: 'info', level: 'info', source: SOURCES.bulletin, plus: true,
      note: tr('clock.queue', { date: d.priorityDate, extra, wait: span(waited, tr) }),
    });
  }

  return out.sort(byUrgency);
}

const RANK: Record<Level, number> = { over: 0, urgent: 1, soon: 2, ok: 3, info: 4 };
export const byUrgency = (a: Clock, b: Clock) =>
  RANK[a.level] - RANK[b.level] || (a.days ?? 1e9) - (b.days ?? 1e9);

/** 1,234 days → "3 years 4 months". */
export function span(days: number, tr: Tr) {
  const y = Math.floor(days / 365.25);
  const m = Math.floor((days - y * 365.25) / 30.44);
  if (y <= 0 && m <= 0) return tr('time.days', { n: days });
  return [y > 0 && tr('time.years', { n: y }), m > 0 && tr('time.months', { n: m })].filter(Boolean).join(' ');
}

/** "in 57 days" / "today" / "3 days ago". */
export function inDays(n: number, tr: Tr) {
  if (n === 0) return tr('time.today');
  if (n === 1) return tr('time.tomorrow');
  if (n === -1) return tr('time.yesterday');
  return n > 0 ? tr('time.inDays', { n }) : tr('time.daysAgo', { n: -n });
}

// ---------- what to ask for, per status (labels are message keys) ----------
type Ask = { key: DateKey; label: string; hint?: string };
const PASSPORT: Ask = { key: 'passport', label: 'ask.passport' };
const I94: Ask = { key: 'i94', label: 'ask.i94', hint: 'ask.i94.hint' };
const VISA: Ask = { key: 'visa', label: 'ask.visa' };
const PRIORITY: Ask = { key: 'priorityDate', label: 'ask.priorityDate.gc', hint: 'ask.priorityDate.hint' };
export const ASK: Record<Status, Ask[]> = {
  'F-1': [{ key: 'programEnd', label: 'ask.programEnd.i20' }, PASSPORT, VISA],
  OPT: [{ key: 'optStart', label: 'ask.optStart' }, { key: 'optEnd', label: 'ask.optEnd' }, PASSPORT, VISA],
  'STEM OPT': [{ key: 'optStart', label: 'ask.optStart.first' }, { key: 'stemEnd', label: 'ask.stemEnd' }, PASSPORT, VISA],
  'J-1': [{ key: 'programEnd', label: 'ask.programEnd.ds2019' }, PASSPORT, VISA],
  'H-1B': [I94, { key: 'h1bStart', label: 'ask.h1bStart' }, PASSPORT, VISA, PRIORITY],
  'H-4': [I94, { key: 'ead', label: 'ask.ead.h4', hint: 'ask.ead.hint' }, PASSPORT, VISA],
  'L-1': [I94, PASSPORT, VISA, PRIORITY],
  'L-2': [I94, { key: 'ead', label: 'ask.ead', hint: 'ask.ead.hint' }, PASSPORT, VISA],
  'O-1': [I94, PASSPORT, VISA],
  TN: [I94, PASSPORT, VISA],
  'E-3': [I94, PASSPORT, VISA],
  'B-1/B-2': [I94, PASSPORT, VISA],
  'Green card pending': [{ key: 'ead', label: 'ask.ead.ap' }, { key: 'priorityDate', label: 'ask.priorityDate' }, PASSPORT],
  'Green card': [{ key: 'residentSince', label: 'ask.residentSince' }, { key: 'cardExpiry', label: 'ask.cardExpiry' }, PASSPORT],
  'Conditional green card': [{ key: 'residentSince', label: 'ask.residentSince' }, { key: 'cardExpiry', label: 'ask.cardExpiry.conditional' }, PASSPORT],
  Other: [I94, { key: 'ead', label: 'ask.ead.other', hint: 'ask.ead.other.hint' }, PASSPORT],
};

/** Status picker groups; the names are message keys. */
export const STATUS_GROUPS: [string, Status[]][] = [
  ['group.study', ['F-1', 'OPT', 'STEM OPT', 'J-1']],
  ['group.work', ['H-1B', 'L-1', 'O-1', 'TN', 'E-3']],
  ['group.family', ['H-4', 'L-2']],
  ['group.greenCard', ['Green card pending', 'Conditional green card', 'Green card']],
  ['group.other', ['B-1/B-2', 'Other']],
];

/** Which policy tags matter to someone in this status (matches the server's radar tags). */
export const TAGS: Record<Status, string[]> = {
  'F-1': ['students', 'OPT'], OPT: ['students', 'OPT', 'work permits'], 'STEM OPT': ['students', 'OPT', 'work permits'],
  'J-1': ['exchange visitors'], 'H-1B': ['H-1B', 'work visas'], 'H-4': ['H-1B', 'H-4', 'work permits'],
  'L-1': ['L-1', 'work visas'], 'L-2': ['L-1', 'work permits'], 'O-1': ['O-1', 'work visas'], TN: ['work visas'], 'E-3': ['work visas'],
  'B-1/B-2': ['visitors'], 'Green card pending': ['green cards', 'work permits'],
  'Green card': ['green cards', 'citizenship'], 'Conditional green card': ['green cards', 'citizenship'], Other: ['humanitarian', 'work permits'],
};
