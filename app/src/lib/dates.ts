// Calendar days are plain 'YYYY-MM-DD' strings in local time — no timezone drift.
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
export const today = () => ymd(new Date());
export const diffDays = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);

export const monday = (s: string) => { const d = parse(s); return addDays(s, -((d.getDay() + 6) % 7)); };

export const fmt = (s: string, o: Intl.DateTimeFormatOptions) => parse(s).toLocaleDateString(undefined, o);
export const weekday = (s: string) => fmt(s, { weekday: 'short' });
export const nice = (s: string) => fmt(s, { weekday: 'short', month: 'short', day: 'numeric' });
export const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export function relative(s: string) {
  const n = diffDays(today(), s);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n > 1 && n < 7) return weekday(s);
  return nice(s);
}

export const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/** 6×7 grid of days for a month view, starting on Monday. */
export function monthGrid(year: number, month: number) {
  const start = monday(ymd(new Date(year, month, 1)));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
