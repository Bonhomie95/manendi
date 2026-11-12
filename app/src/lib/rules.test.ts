import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clocks, daysAbroad, isDate, span, type Person } from './rules.ts';

const TODAY = '2026-11-12';
const person = (p: Partial<Person>): Person => ({ id: 'p', name: 'Ada', relation: 'me', status: 'Other', dates: {}, jobs: [], trips: [], ...p });
const find = (p: Person, id: string, today = TODAY) => clocks(p, today).find((c) => c.id === id);

test('OPT unemployment runs on every jobless day, weekends included', () => {
  const p = person({ status: 'OPT', dates: { optStart: '2026-01-01', optEnd: '2026-12-31' }, jobs: [{ id: 'j', employer: 'Acme', start: '2026-02-01', end: '2026-05-31' }] });
  const c = find(p, 'unemployment', '2026-07-01')!;
  assert.deepEqual(c.count, { used: 62, limit: 90, unit: 'days' }); // Jan (31) + Jun 1–Jul 1 (31)
  assert.equal(c.level, 'urgent');
  assert.equal(c.date, '2026-07-29');
});

test('STEM OPT shares a 150-day budget with OPT', () => {
  const p = person({ status: 'STEM OPT', dates: { optStart: '2026-01-01', stemEnd: '2028-12-31' }, jobs: [{ id: 'j', employer: 'Acme', start: '2026-02-01', end: '2026-05-31' }] });
  const c = find(p, 'unemployment', '2026-07-01')!;
  assert.equal(c.count!.limit - c.count!.used, 88);
  assert.equal(c.level, 'soon');
});

test('the OPT clock pauses while you work', () => {
  const p = person({ status: 'OPT', dates: { optStart: '2026-01-01', optEnd: '2026-12-31' }, jobs: [
    { id: 'a', employer: 'Acme', start: '2026-02-01', end: '2026-05-31' }, { id: 'b', employer: 'Beta', start: '2026-06-15' }] });
  const c = find(p, 'unemployment', '2026-07-01')!;
  assert.equal(c.count!.used, 45);
  assert.equal(c.level, 'ok');
  assert.equal(c.date, undefined);
});

test('the 60-day grace period stops at the I-94 date if that comes first', () => {
  const p = person({ status: 'H-1B', dates: { i94: '2026-07-01' }, jobs: [{ id: 'j', employer: 'Acme', start: '2024-01-01', end: '2026-06-10' }] });
  const c = find(p, 'grace', '2026-06-20')!;
  assert.equal(c.date, '2026-07-01');
  assert.equal(c.days, 11);
  assert.equal(c.level, 'urgent');
});

test('no grace clock once a new job has started', () => {
  const p = person({ status: 'H-1B', jobs: [{ id: 'a', employer: 'Acme', start: '2024-01-01', end: '2026-06-10' }, { id: 'b', employer: 'Beta', start: '2026-07-01' }] });
  assert.equal(find(p, 'grace'), undefined);
});

test('citizenship opens 90 days before the 5-year (or 3-year) anniversary', () => {
  const five = find(person({ status: 'Green card', dates: { residentSince: '2022-03-15' } }), 'n400')!;
  assert.equal(five.date, '2026-12-15');
  assert.equal(five.level, 'soon');
  const three = find(person({ status: 'Green card', dates: { residentSince: '2022-03-15' }, marriedToCitizen: true }), 'n400')!;
  assert.equal(three.date, '2024-12-15');
  assert.equal(three.title, 'You can apply for citizenship');
});

test('travel budget counts full days abroad in the statutory window', () => {
  const p = person({ status: 'Green card', dates: { residentSince: '2021-01-01' }, trips: [{ id: 't', depart: '2022-06-01', return: '2022-09-01' }] });
  const c = find(p, 'presence')!;
  assert.deepEqual(c.count, { used: 91, limit: 913, unit: 'days abroad' });
  assert.equal(c.level, 'ok');
});

test('a trip over 6 months flags continuous residence', () => {
  const p = person({ status: 'Green card', dates: { residentSince: '2020-01-01' }, trips: [{ id: 'long', depart: '2023-01-01', return: '2023-08-01' }] });
  const c = find(p, 'residence-long')!;
  assert.equal(c.level, 'urgent');
  assert.match(c.note, /^211 days away/);
});

test('EAD renewal window opens 180 days out', () => {
  const open = find(person({ status: 'H-4', dates: { ead: '2027-03-01' } }), 'ead')!;
  assert.equal(open.title, 'Renew your work permit');
  assert.equal(open.days, 109);
  assert.equal(open.level, 'soon');
  assert.equal(find(person({ status: 'H-4', dates: { ead: '2026-12-01' } }), 'ead')!.level, 'urgent');
  const later = find(person({ status: 'H-4', dates: { ead: '2027-12-01' } }), 'ead')!;
  assert.equal(later.title, 'EAD renewal window');
  assert.equal(later.date, '2027-06-04');
});

test('H-1B six years plus recaptured days abroad', () => {
  const p = person({ status: 'H-1B', dates: { h1bStart: '2021-10-01' }, trips: [{ id: 't', depart: '2023-07-01', return: '2023-07-31' }] });
  assert.equal(find(p, 'h1b-max')!.date, '2027-10-30');
});

test('I-751 window is the last 90 days of the 2-year card', () => {
  const c = find(person({ status: 'Conditional green card', dates: { cardExpiry: '2027-01-20' } }), 'i751')!;
  assert.equal(c.title, 'Remove conditions now');
  assert.equal(c.days, 69);
  assert.equal(c.level, 'soon');
});

test('F-1 OPT window shows when it opens', () => {
  const c = find(person({ status: 'F-1', dates: { programEnd: '2027-05-15' } }), 'opt-window')!;
  assert.equal(c.date, '2027-02-14');
  assert.equal(c.level, 'info');
});

test('F-1 grace is 30 days for programs ending from Sept 15, 2026, 60 before', () => {
  const f1 = (programEnd: string, today: string) => find(person({ status: 'F-1', dates: { programEnd } }), 'f1-grace', today)!;
  assert.equal(f1('2027-05-15', '2027-05-20').date, '2027-06-14');
  assert.equal(f1('2027-05-15', '2027-05-20').title, '30-day grace period');
  assert.equal(f1('2026-05-15', '2026-05-20').date, '2026-07-14');
  const win = find(person({ status: 'F-1', dates: { programEnd: '2027-05-15' } }), 'opt-window', '2027-05-01')!;
  assert.equal(win.date, '2027-06-14');
});

test('D/S students with long programs need an extension before Sept 15, 2030', () => {
  const p = person({ status: 'F-1', ds: true, dates: { programEnd: '2031-05-31' } });
  assert.equal(find(p, 'ds-cap')!.date, '2030-09-15');
  assert.equal(find(person({ status: 'F-1', ds: true, dates: { programEnd: '2028-05-31' } }), 'ds-cap'), undefined);
});

test('D/S on the I-94 means no I-94 countdown; expired stamps are calm', () => {
  const p = person({ status: 'F-1', ds: true, dates: { i94: '2027-01-01', visa: '2026-01-01' } });
  assert.equal(find(p, 'i94'), undefined);
  assert.equal(find(p, 'visa')!.level, 'info');
});

test('most pressing first', () => {
  const p = person({ status: 'H-1B', dates: { passport: '2026-10-01', i94: '2026-12-01', visa: '2030-01-01' } });
  assert.deepEqual(clocks(p, TODAY).map((c) => c.level), ['over', 'urgent', 'info']);
});

test('helpers', () => {
  assert.equal(daysAbroad({ id: 't', depart: '2026-11-01' }, '2026-01-01', TODAY), 11);
  assert.equal(span(1234), '3 years 4 months');
  assert.equal(isDate('2026-02-30'), false);
  assert.equal(isDate('2028-02-29'), true);
});
