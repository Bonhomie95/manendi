// USCIS Case Status API (developer.uscis.gov, "Torch"). Sandbox until production access is granted — USCIS books the
// required demo months out. USCIS_MOCK=1 serves made-up statuses for development. USCIS terms: only ever look up a
// user's own receipts — no "neighbor" scans.
const fail = (status, error) => Object.assign(new Error(error), { status });

export const RECEIPT = /^[A-Z]{3}\d{10}$/;
export const cleanReceipt = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const usDate = (s) => { // "09-05-2023 14:28:46" → "2023-09-05"
  const m = /^(\d{2})-(\d{2})-(\d{4})/.exec(String(s ?? ''));
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
};

export function normalize(json) {
  const c = json?.case_status;
  if (!c?.receiptNumber) return null;
  return {
    receipt: c.receiptNumber, form: c.formType ?? null,
    status: c.current_case_status_text_en || 'Status unavailable', detail: c.current_case_status_desc_en ?? '',
    submitted: usDate(c.submittedDate), modified: usDate(c.modifiedDate),
    history: (c.hist_case_status ?? []).map((h) => ({ status: h.completed_text_en, date: usDate(h.date) })).filter((h) => h.status),
  };
}

const MOCK = [
  ['Case Was Received', 'We received your Form and mailed you a receipt notice.'],
  ['Fingerprints Were Taken', 'Your biometrics were taken and are part of your file.'],
  ['Interview Was Scheduled', 'We scheduled an interview and mailed you a notice with the date and place.'],
  ['Request for Evidence Was Sent', 'We mailed a request for evidence. Respond by the date on the notice.'],
  ['Case Is Being Actively Reviewed By USCIS', 'An officer is reviewing your case.'],
  ['Case Was Approved', 'We approved your Form and mailed you an approval notice.'],
  ['New Card Is Being Produced', 'We ordered your new card. It will be mailed once it is produced.'],
  ['Card Was Delivered To Me By The Post Office', 'The Post Office delivered your new card.'],
];
const FORMS = ['I-765', 'I-485', 'I-130', 'I-140', 'I-129', 'I-539', 'I-131', 'N-400', 'I-90', 'I-751'];

/** Deterministic per receipt, and it moves one step a week so change alerts can be exercised. */
export function mockStatus(receipt, now = Date.now()) {
  const seed = [...receipt.slice(3)].reduce((n, ch) => n + Number(ch), 0);
  const week = Math.floor(now / (7 * 864e5));
  const i = Math.min(MOCK.length - 1, (seed + week) % (MOCK.length + 3));
  const day = (n) => new Date(now - n * 864e5).toISOString().slice(0, 10);
  return {
    receipt, form: FORMS[seed % FORMS.length], status: MOCK[i][0], detail: `${MOCK[i][1]} (Test data — not from USCIS.)`,
    submitted: day(120), modified: day(3),
    history: MOCK.slice(0, i).map(([status], k) => ({ status, date: day(120 - k * 14) })).reverse(),
  };
}

export function uscis({ base = 'https://api-int.uscis.gov', id, secret, mock = false, get = fetch } = {}) {
  let token = null; // { value, until }
  async function accessToken() {
    if (token && token.until > Date.now()) return token.value;
    const r = await get(`${base}/oauth/accesstoken`, {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
    });
    if (!r.ok) throw fail(502, 'Couldn’t reach USCIS right now');
    const j = await r.json();
    token = { value: j.access_token, until: Date.now() + (Number(j.expires_in) - 60) * 1000 };
    return token.value;
  }
  const live = mock || !!(id && secret);
  return {
    live,
    mock,
    async status(receipt) {
      if (mock) return mockStatus(receipt);
      if (!live) throw fail(503, 'Live case status isn’t switched on yet');
      for (let tries = 0; tries < 2; tries++) {
        const r = await get(`${base}/case-status/${receipt}`, { headers: { authorization: `Bearer ${await accessToken()}`, accept: 'application/json' } });
        if (r.status === 401) { token = null; continue; }
        if (r.status === 400 || r.status === 404) throw fail(404, 'USCIS doesn’t recognize that receipt number');
        if (r.status === 429) throw fail(429, 'USCIS is busy — try again in a minute');
        // Maintenance windows; the sandbox only runs weekdays 7am–8pm Eastern.
        if (r.status === 503) throw fail(503, 'USCIS case status is offline for now. Manendi will check again soon.');
        if (!r.ok) throw fail(502, 'Couldn’t reach USCIS right now');
        const c = normalize(await r.json());
        if (!c) throw fail(404, 'USCIS doesn’t recognize that receipt number');
        return c;
      }
      throw fail(502, 'Couldn’t reach USCIS right now');
    },
  };
}
