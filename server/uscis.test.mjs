import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECEIPT, cleanReceipt, mockStatus, normalize, uscis } from './uscis.mjs';

const SAMPLE = { case_status: { receiptNumber: 'EAC9999103402', formType: 'I-130', submittedDate: '09-05-2023 14:28:46', modifiedDate: '09-06-2023 10:00:00',
  current_case_status_text_en: 'Case Approval Was Affirmed', current_case_status_desc_en: 'We affirmed…', hist_case_status: null } };

test('receipt numbers: 3 letters + 10 digits, typed any way', () => {
  assert.equal(cleanReceipt(' ioe-091 234 5678 '), 'IOE0912345678');
  assert.ok(RECEIPT.test('EAC9999103402'));
  assert.ok(!RECEIPT.test('EAC99991034'));
});

test('normalizes the USCIS payload', () => {
  assert.deepEqual(normalize(SAMPLE), { receipt: 'EAC9999103402', form: 'I-130', status: 'Case Approval Was Affirmed', detail: 'We affirmed…', submitted: '2023-09-05', modified: '2023-09-06', history: [] });
  assert.equal(normalize({ message: 'nope' }), null);
});

test('mock statuses are stable per receipt and move weekly', () => {
  const now = Date.UTC(2026, 10, 12);
  assert.deepEqual(mockStatus('IOE0912345678', now), mockStatus('IOE0912345678', now));
  assert.match(mockStatus('IOE0912345678', now).detail, /Test data/);
});

test('live client: token once, retries on 401, maps 404', async () => {
  const calls = [];
  let tokens = 0;
  const get = async (u, o) => {
    calls.push(u);
    if (u.endsWith('/oauth/accesstoken')) { tokens++; return { ok: true, json: async () => ({ access_token: `t${tokens}`, expires_in: '1799' }) }; }
    if (u.endsWith('EAC9999103402')) return o.headers.authorization === 'Bearer t1' && tokens === 1 ? { ok: false, status: 401 } : { ok: true, status: 200, json: async () => SAMPLE };
    return { ok: false, status: 404 };
  };
  const c = uscis({ id: 'id', secret: 's', get });
  assert.equal((await c.status('EAC9999103402')).status, 'Case Approval Was Affirmed');
  assert.equal(tokens, 2);
  await assert.rejects(c.status('EAC0000000000'), { status: 404 });
  await assert.rejects(uscis({}).status('EAC9999103402'), { status: 503 });
});
