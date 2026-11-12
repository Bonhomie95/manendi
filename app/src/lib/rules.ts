// Manendi's status rules: every date that keeps someone in status, turned into countdowns.
// Pure TS with no imports, so the app and `node --test` run the same file.
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
  count?: { used: number; limit: number; unit: string };
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
const pretty = (s: string) => new Date(ms(s)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
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

/** Every clock for one person, most pressing first. */
export function clocks(p: Person, today: string): Clock[] {
  const out: Clock[] = [];
  const d = p.dates;
  const add = (c: Omit<Clock, 'personId' | 'days'>) =>
    out.push({ ...c, personId: p.id, days: c.date ? daysBetween(today, c.date) : undefined });
  const lpr = GREEN.includes(p.status);

  if (d.passport) {
    const n = daysBetween(today, d.passport);
    add({
      id: 'passport', title: 'Passport', kind: 'expires', date: d.passport, source: SOURCES.passport,
      level: level(n, 60, 180), progress: clamp(n / 365),
      note: n < 0 ? 'Expired. Renew it before you travel or file anything new.'
        : n <= 180 ? 'Under 6 months left. Many trips and filings need more, so renew early.'
          : 'Keep at least 6 months on it before any trip.',
    });
  }

  if (!lpr && d.i94 && !p.ds) {
    const n = daysBetween(today, d.i94);
    const visitor = p.status === 'B-1/B-2';
    const work = WORK.includes(p.status);
    add({
      id: 'i94', title: 'Authorized stay (I-94)', kind: 'expires', date: d.i94, source: SOURCES.i94,
      level: visitor ? level(n, 14, 45) : level(n, 30, 180), progress: clamp(n / 180), // the 6-month extension window
      note: n < 0 ? 'This date has passed. Talk to an immigration attorney today.'
        : visitor ? 'Overstaying even a day can cancel your visa. To stay longer, file Form I-539 before this date.'
          : work ? 'This, not your visa stamp, is when your stay ends. Extensions can usually be filed up to 6 months ahead.'
            : 'This, not your visa stamp, is when your stay ends. Any extension has to be filed before it.',
    });
  }

  if (!lpr && d.visa) {
    const n = daysBetween(today, d.visa);
    add({
      id: 'visa', title: 'Visa stamp', kind: 'info', date: d.visa, source: SOURCES.visa, level: 'info',
      note: n < 0 ? 'Expired, which is fine while you stay inside the US. You need a new one before you re-enter.'
        : 'Only matters when you re-enter the US. It doesn’t decide how long you can stay.',
    });
  }

  if (d.ead && EAD_CLOCK.includes(p.status)) {
    const n = daysBetween(today, d.ead);
    const opens = shift(d.ead, -180);
    const o = daysBetween(today, opens);
    if (n < 0) {
      add({ id: 'ead', title: 'Work permit (EAD)', kind: 'expires', date: d.ead, level: 'over', progress: 0, source: SOURCES.ead,
        note: 'Expired. You may not be allowed to work until the renewal is approved, so check with your attorney or HR.' });
    } else if (o > 0) {
      add({ id: 'ead', title: 'EAD renewal window', kind: 'window', date: opens, level: o <= 30 ? 'soon' : 'ok', progress: clamp(n / 545), source: SOURCES.ead,
        note: 'Opens 180 days before your card expires. Most renewals filed since Oct 30, 2025 get no automatic extension, so file on day one.' });
    } else {
      add({ id: 'ead', title: 'Renew your work permit', kind: 'window', date: d.ead, level: n <= 90 ? 'urgent' : 'soon', progress: clamp(n / 180), source: SOURCES.ead,
        note: 'The renewal window is open. File Form I-765 now: it has to be approved before this date for you to keep working.' });
    }
  }

  if ((p.status === 'OPT' || p.status === 'STEM OPT') && d.optStart) {
    const stem = p.status === 'STEM OPT';
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
        id: 'unemployment', title: `${stem ? 'STEM OPT' : 'OPT'} unemployment days`, kind: 'counter',
        count: { used: Math.min(used, limit), limit, unit: 'days' }, progress: left / limit,
        date: running ? shift(today, left) : undefined, source: stem ? SOURCES.stem : SOURCES.opt,
        level: left === 0 ? 'over' : running ? (left <= 30 ? 'urgent' : 'soon') : left <= 30 ? 'soon' : 'ok',
        note: left === 0 ? 'You’ve used every unemployment day. Talk to your DSO today.'
          : running ? `Running. Every day without qualifying work counts, weekends and days abroad too. ${left} left.`
            : `Paused while you work. ${left} of ${limit} left${stem ? ' across OPT and STEM OPT' : ''}. Report new jobs within 10 days.`,
      });
    }
    if (end) {
      const after = today > end;
      const g = f1Grace(end);
      const grace = shift(end, g);
      add({
        id: 'opt-end', title: after ? `${g}-day grace period` : `${stem ? 'STEM OPT' : 'OPT'} ends`, kind: after ? 'window' : 'milestone',
        date: after ? grace : end, source: stem ? SOURCES.stem : SOURCES.opt,
        level: after ? level(daysBetween(today, grace), g, g) : level(daysBetween(today, end), 30, 120),
        progress: after ? clamp(daysBetween(today, grace) / g) : undefined,
        note: after ? 'Your OPT has ended. Before this date: change status, start a new program, or leave.'
          : `After this you get ${g} days to change status, start a new program, or leave.`,
      });
    }
    if (!stem && d.optEnd) {
      const opens = shift(d.optEnd, -90);
      if (today <= d.optEnd) {
        const open = today >= opens;
        add({
          id: 'stem', title: 'STEM OPT extension window', kind: 'window', date: open ? d.optEnd : opens, source: SOURCES.stem,
          level: open ? 'soon' : 'info', progress: open ? clamp(daysBetween(today, d.optEnd) / 90) : undefined,
          note: open ? 'Open now if your degree is on the STEM list. USCIS has to receive it before your OPT ends.'
            : 'If your degree is on the STEM list, you can apply for 24 more months from this date.',
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
        id: 'opt-window', title: 'OPT application window', kind: 'window', date: open ? closes : opens, source: SOURCES.opt,
        level: open ? (n <= 21 ? 'urgent' : 'soon') : 'info', progress: open ? clamp(n / 150) : undefined,
        note: open ? 'Open. USCIS must receive your I-765 within 30 days of your DSO’s recommendation, while your stay is still valid.'
          : `Opens 90 days before your program ends and closes ${g} days after.`,
      });
    }
    const grace = shift(d.programEnd, g);
    add({
      id: 'f1-grace', title: today > d.programEnd ? `${g}-day grace period` : 'Program ends', kind: 'milestone',
      date: today > d.programEnd ? grace : d.programEnd, source: SOURCES.opt,
      level: today > d.programEnd ? level(daysBetween(today, grace), g, g) : level(daysBetween(today, d.programEnd), 30, 120),
      note: `After your program ends you have ${g} days to start OPT, transfer, change status, or leave.`,
    });
  }

  if ((p.status === 'F-1' || p.status === 'J-1') && p.ds && d.programEnd && d.programEnd > DS_CAP) {
    add({
      id: 'ds-cap', title: 'Extension of stay needed', kind: 'milestone', date: DS_CAP, source: SOURCES.extend,
      level: level(daysBetween(today, DS_CAP), 90, 365),
      note: 'D/S now ends on Sept 15, 2030 at the latest. Your program runs longer, so file Form I-539 before then. Any trip abroad gets you a fixed I-94 date instead.',
    });
  }

  if (p.status === 'J-1' && d.programEnd) {
    const after = today > d.programEnd;
    const grace = shift(d.programEnd, 30);
    add({
      id: 'j1-grace', title: after ? '30-day grace period' : 'Program ends (DS-2019)', kind: 'milestone', source: SOURCES.j1,
      date: after ? grace : d.programEnd, level: after ? level(daysBetween(today, grace), 30, 30) : level(daysBetween(today, d.programEnd), 30, 120),
      note: 'J-1 programs come with 30 days after the end date to prepare and leave. Extensions go through your sponsor.',
    });
  }

  if (WORK.includes(p.status)) {
    const last = [...p.jobs].sort((a, b) => (a.start < b.start ? 1 : -1))[0];
    if (last?.end && !p.jobs.some((j) => j.start > last.end!)) {
      const graceEnd = min(shift(last.end, 60), d.i94);
      const n = daysBetween(today, graceEnd);
      add({
        id: 'grace', title: '60-day grace period', kind: 'window', date: graceEnd, source: SOURCES.grace, progress: clamp(n / 60),
        level: today <= last.end ? 'soon' : n < 0 ? 'over' : 'urgent',
        note: today <= last.end
          ? `Your job ends ${pretty(last.end)}. From the next day you get up to 60 days, or until your I-94 date if that comes first.`
          : 'Before this date: a new employer files for you, you change status, or you leave. An attorney can help you pick fast.',
      });
    }
  }

  if (p.status === 'H-1B' && d.h1bStart) {
    const recaptured = totalAbroad(p.trips, d.h1bStart, today);
    const maxOut = shift(addYears(d.h1bStart, 6), recaptured);
    const n = daysBetween(today, maxOut);
    add({
      id: 'h1b-max', title: 'H-1B six-year limit', kind: 'milestone', date: maxOut, source: SOURCES.h1b, plus: true,
      level: n < 0 ? 'info' : n <= 365 ? 'soon' : 'ok', progress: clamp(n / 2190),
      note: `Six years from ${pretty(d.h1bStart)}, plus ${recaptured} day${recaptured === 1 ? '' : 's'} abroad you can win back. A green card in process can extend it.`,
    });
  }

  if (p.status === 'Green card pending') {
    add({ id: 'ap', title: 'Travel needs advance parole', kind: 'info', level: 'info', source: SOURCES.ap,
      note: 'Leaving while your I-485 is pending can abandon it, unless you have advance parole or keep valid H or L status.' });
  }

  if (p.status === 'Green card' && d.cardExpiry) {
    const n = daysBetween(today, d.cardExpiry);
    const opens = shift(d.cardExpiry, -180);
    const open = today >= opens;
    add({
      id: 'i90', title: open ? 'Renew your green card' : 'Green card renewal opens', kind: open ? 'window' : 'milestone',
      date: open ? d.cardExpiry : opens, source: SOURCES.i90, progress: clamp(n / 3650),
      level: n < 0 ? 'over' : open ? (n <= 60 ? 'urgent' : 'soon') : 'ok',
      note: n < 0 ? 'Your card has expired. Your status hasn’t, but you need a valid card to travel and work. File Form I-90.'
        : 'Your status doesn’t expire, only the card does. You can renew with Form I-90 in the last 6 months.',
    });
  }

  if (p.status === 'Conditional green card' && d.cardExpiry) {
    const n = daysBetween(today, d.cardExpiry);
    const opens = shift(d.cardExpiry, -90);
    const open = today >= opens;
    add({
      id: 'i751', title: open ? 'Remove conditions now' : 'Remove-conditions window', kind: 'window',
      date: open ? d.cardExpiry : opens, source: SOURCES.i751, progress: clamp(n / 730),
      level: n < 0 ? 'over' : open ? (n <= 30 ? 'urgent' : 'soon') : daysBetween(today, opens) <= 60 ? 'soon' : 'ok',
      note: n < 0 ? 'Your conditional card has expired. Talk to an immigration attorney now.'
        : 'File Form I-751 (I-829 for EB-5) in the 90 days before your 2-year card expires.',
    });
  }

  if (lpr && d.residentSince) {
    const years = p.marriedToCitizen ? 3 : 5;
    const anniversary = addYears(d.residentSince, years);
    const eligible = shift(anniversary, -90);
    const n = daysBetween(today, eligible);
    add({
      id: 'n400', title: n <= 0 ? 'You can apply for citizenship' : 'Citizenship window', kind: 'milestone', date: eligible,
      source: SOURCES.n400, level: n <= 0 ? 'ok' : n <= 120 ? 'soon' : 'ok', progress: clamp(1 - n / (years * 365)),
      note: n <= 0 ? 'You can file Form N-400 now, as long as your time abroad fits the rules below.'
        : `You can file Form N-400 from this date: 90 days before your ${years}-year green card anniversary.`,
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
      id: 'presence', title: 'Travel budget for citizenship', kind: 'counter', plus: true, source: SOURCES.presence,
      count: { used, limit: allowed, unit: 'days abroad' }, progress: clamp(left / allowed),
      level: left < 0 ? 'over' : left < 60 ? 'urgent' : left < 180 ? 'soon' : 'ok',
      note: left < 0 ? `You’ve spent ${-left} days too many abroad for this window. Your filing date may need to move.`
        : `About ${left} more days abroad before ${pretty(periodEnd)} still keeps you over the ${required}-day presence rule.`,
    });

    // Continuous residence: a single trip of 6 months or more puts it in doubt; a year or more breaks it.
    for (const t of p.trips) {
      const away = daysAbroad(t, periodStart, today);
      if (away >= 150) {
        add({
          id: `residence-${t.id}`, title: away >= 365 ? 'Continuous residence broken' : 'Long trip: continuous residence',
          kind: 'info', source: SOURCES.residence, plus: true, level: away >= 180 ? 'urgent' : 'soon',
          note: away >= 365 ? `${away} days away. A year or more breaks continuous residence, so the clock restarts.`
            : away >= 180 ? `${away} days away. Trips of 6 months or more can break continuous residence. Keep proof of your US ties.`
              : `${away} days away. At 180 days this trip starts to count against continuous residence.`,
        });
      }
    }
  }

  if (d.priorityDate && !lpr) {
    const waited = daysBetween(d.priorityDate, today);
    add({
      id: 'queue', title: 'Green card queue', kind: 'info', level: 'info', source: SOURCES.bulletin, plus: true,
      note: `Priority date ${pretty(d.priorityDate)}${p.category ? ` · ${p.category}` : ''}${p.chargeability ? ` · ${p.chargeability}` : ''}. Waiting ${span(waited)}. Compare it with this month’s Visa Bulletin.`,
    });
  }

  return out.sort(byUrgency);
}

const RANK: Record<Level, number> = { over: 0, urgent: 1, soon: 2, ok: 3, info: 4 };
export const byUrgency = (a: Clock, b: Clock) =>
  RANK[a.level] - RANK[b.level] || (a.days ?? 1e9) - (b.days ?? 1e9);

/** 1,234 days → "3 years 4 months". */
export function span(days: number) {
  const y = Math.floor(days / 365.25);
  const m = Math.floor((days - y * 365.25) / 30.44);
  if (y <= 0 && m <= 0) return `${days} day${days === 1 ? '' : 's'}`;
  return [y > 0 && `${y} year${y === 1 ? '' : 's'}`, m > 0 && `${m} month${m === 1 ? '' : 's'}`].filter(Boolean).join(' ');
}

/** "in 57 days" / "today" / "3 days ago". */
export function inDays(n: number) {
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n.toLocaleString()} days` : `${(-n).toLocaleString()} days ago`;
}

// ---------- what to ask for, per status ----------
type Ask = { key: DateKey; label: string; hint?: string };
const PASSPORT: Ask = { key: 'passport', label: 'Passport expires' };
const I94: Ask = { key: 'i94', label: 'I-94 “admit until” date', hint: 'On your I-94 record at i94.cbp.dhs.gov' };
const VISA: Ask = { key: 'visa', label: 'Visa stamp expires' };
export const ASK: Record<Status, Ask[]> = {
  'F-1': [{ key: 'programEnd', label: 'Program end date (I-20)' }, PASSPORT, VISA],
  OPT: [{ key: 'optStart', label: 'OPT start (EAD card)' }, { key: 'optEnd', label: 'OPT end (EAD card)' }, PASSPORT, VISA],
  'STEM OPT': [{ key: 'optStart', label: 'First OPT start date' }, { key: 'stemEnd', label: 'STEM OPT end (EAD card)' }, PASSPORT, VISA],
  'J-1': [{ key: 'programEnd', label: 'Program end date (DS-2019)' }, PASSPORT, VISA],
  'H-1B': [I94, { key: 'h1bStart', label: 'First day in H-1B status' }, PASSPORT, VISA, { key: 'priorityDate', label: 'Green card priority date', hint: 'If your employer started one' }],
  'H-4': [I94, { key: 'ead', label: 'H-4 EAD expires', hint: 'If you have one' }, PASSPORT, VISA],
  'L-1': [I94, PASSPORT, VISA, { key: 'priorityDate', label: 'Green card priority date', hint: 'If your employer started one' }],
  'L-2': [I94, { key: 'ead', label: 'EAD expires', hint: 'If you have one' }, PASSPORT, VISA],
  'O-1': [I94, PASSPORT, VISA],
  TN: [I94, PASSPORT, VISA],
  'E-3': [I94, PASSPORT, VISA],
  'B-1/B-2': [I94, PASSPORT, VISA],
  'Green card pending': [{ key: 'ead', label: 'EAD / advance parole card expires' }, { key: 'priorityDate', label: 'Priority date' }, PASSPORT],
  'Green card': [{ key: 'residentSince', label: 'Resident since (on your card)' }, { key: 'cardExpiry', label: 'Card expires' }, PASSPORT],
  'Conditional green card': [{ key: 'residentSince', label: 'Resident since (on your card)' }, { key: 'cardExpiry', label: 'Card expires (2-year card)' }, PASSPORT],
  Other: [I94, { key: 'ead', label: 'Work permit (EAD) expires', hint: 'Asylum, TPS, parole…' }, PASSPORT],
};

export const STATUS_GROUPS: [string, Status[]][] = [
  ['Study', ['F-1', 'OPT', 'STEM OPT', 'J-1']],
  ['Work', ['H-1B', 'L-1', 'O-1', 'TN', 'E-3']],
  ['Family of a worker', ['H-4', 'L-2']],
  ['Green card', ['Green card pending', 'Conditional green card', 'Green card']],
  ['Other', ['B-1/B-2', 'Other']],
];

/** Which policy tags matter to someone in this status (matches the server's radar tags). */
export const TAGS: Record<Status, string[]> = {
  'F-1': ['students', 'OPT'], OPT: ['students', 'OPT', 'work permits'], 'STEM OPT': ['students', 'OPT', 'work permits'],
  'J-1': ['exchange visitors'], 'H-1B': ['H-1B', 'work visas'], 'H-4': ['H-1B', 'H-4', 'work permits'],
  'L-1': ['L-1', 'work visas'], 'L-2': ['L-1', 'work permits'], 'O-1': ['O-1', 'work visas'], TN: ['work visas'], 'E-3': ['work visas'],
  'B-1/B-2': ['visitors'], 'Green card pending': ['green cards', 'work permits'],
  'Green card': ['green cards', 'citizenship'], 'Conditional green card': ['green cards', 'citizenship'], Other: ['humanitarian', 'work permits'],
};
