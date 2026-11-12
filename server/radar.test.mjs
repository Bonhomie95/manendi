import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchRadar, shape, tag } from './radar.mjs';

const doc = (n, title, extra = {}) => ({ document_number: n, title, abstract: '', html_url: `https://fr/${n}`, publication_date: '2026-11-01', agencies: [{ name: 'U.S. Citizenship and Immigration Services' }], type: 'Rule', ...extra });

test('tags by who a document affects', () => {
  assert.deepEqual(tag(doc('1', 'Modernizing H-1B Requirements and Practical Training for F-1 Students')), ['H-1B', 'students', 'OPT']);
  assert.deepEqual(tag(doc('2', 'Removal of Automatic Extension of Employment Authorization Documents')), ['work permits']);
  assert.deepEqual(tag(doc('3', 'U.S. Citizenship and Immigration Services Fee Schedule')), ['citizenship', 'fees']);
});

test('drops paperwork notices, duplicates and anything off-topic; newest first', () => {
  const out = shape([
    doc('a', 'Agency Information Collection Activities; Application To Register Permanent Residence'),
    doc('b', 'Special Local Regulation; Marine Events'),
    doc('c', 'Designation of Haiti for Temporary Protected Status', { publication_date: '2026-10-01' }),
    doc('d', 'Restriction on Entry of Certain Nonimmigrant Workers', { type: 'Presidential Document', publication_date: '2026-11-05' }),
    doc('d', 'Restriction on Entry of Certain Nonimmigrant Workers'),
  ]);
  assert.deepEqual(out.map((d) => d.id), ['d', 'c']);
  assert.deepEqual(out[0].tags, ['work visas', 'travel & entry']);
  assert.equal(out[1].agencies[0], 'U.S. Citizenship and Immigration Services');
});

test('fetchRadar asks the Federal Register three ways and merges', async () => {
  const urls = [];
  const get = async (u) => { const n = urls.push(u); return { ok: true, json: async () => ({ results: [doc(String(n), 'Asylum Procedures')] }) }; };
  const items = await fetchRadar('2026-01-01', get);
  assert.equal(urls.length, 3);
  assert.ok(urls.every((u) => u.startsWith('https://www.federalregister.gov/api/v1/documents.json?')));
  assert.equal(items.length, 3);
  await assert.rejects(fetchRadar('2026-01-01', async () => ({ ok: false, status: 503 })), /Federal Register 503/);
});
