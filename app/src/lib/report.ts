import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { full, today } from './dates';
import { inDays, type Clock, type Person } from './rules';
import type { CaseLink } from './store';
import type { Watch } from './api';

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);
const COLOR = { over: '#D93A30', urgent: '#D9481F', soon: '#B86E05', ok: '#17805C', info: '#5E6878' };

/** One clean page per person — every date and case — for an attorney, a DSO or HR. Built on the phone. */
export async function shareReport(people: Person[], all: Clock[], cases: CaseLink[], watches: Watch[]) {
  const t = today();
  const section = (p: Person) => {
    const rows = all.filter((c) => c.personId === p.id).map((c) => `
      <tr><td><span class="dot" style="background:${COLOR[c.level]}"></span>${esc(c.title)}</td>
      <td>${c.date ? `${full(c.date)}<br><small>${inDays(c.days ?? 0)}</small>` : c.count ? `${c.count.limit - c.count.used} ${c.count.unit} left` : '—'}</td>
      <td><small>${esc(c.note)}</small></td></tr>`).join('');
    const mine = cases.filter((k) => k.personId === p.id).map((k) => {
      const w = watches.find((x) => x.receipt === k.receipt);
      return `<tr><td>${k.receipt}${w?.form ? ` · ${w.form}` : ''}</td><td>${esc(w?.status ?? k.log[0]?.status ?? 'No status yet')}</td><td>${w?.modified ? full(w.modified) : k.log[0]?.date ? full(k.log[0].date) : ''}</td></tr>`;
    }).join('');
    const trips = p.trips.map((x) => `<li>${full(x.depart)} → ${x.return ? full(x.return) : 'still away'}${x.place ? ` · ${esc(x.place)}` : ''}</li>`).join('');
    return `<h2>${esc(p.name)} <span class="tag">${esc(p.status)}</span></h2>
      <table><tr><th>Date</th><th>When</th><th>Note</th></tr>${rows || '<tr><td colspan="3">No dates entered</td></tr>'}</table>
      ${mine ? `<h3>Cases</h3><table><tr><th>Receipt</th><th>Status</th><th>Updated</th></tr>${mine}</table>` : ''}
      ${trips ? `<h3>Trips abroad</h3><ul>${trips}</ul>` : ''}`;
  };
  const html = `<html><head><meta charset="utf-8"><style>
    body{font:13px -apple-system,Helvetica,Arial,sans-serif;color:#0F1B2D;padding:28px}h1{font:400 30px Georgia,serif;margin:0}
    h2{font:400 22px Georgia,serif;margin:26px 0 8px}h3{font-size:13px;margin:16px 0 6px;color:#5E6878;text-transform:uppercase;letter-spacing:1px}
    table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:7px 6px;border-bottom:1px solid #E6DFD0;vertical-align:top}
    th{font-size:11px;color:#5E6878;text-transform:uppercase}small{color:#5E6878}.dot{display:inline-block;width:8px;height:8px;border-radius:4px;margin-right:6px}
    .tag{font:600 12px -apple-system,Helvetica,sans-serif;background:#EEE8DA;border-radius:8px;padding:2px 8px;vertical-align:middle}
    .foot{margin-top:30px;color:#5E6878;font-size:11px}</style></head><body>
    <h1>Status report</h1><div><small>Prepared with Manendi on ${full(t)}</small></div>
    ${people.map(section).join('')}
    <p class="foot">Dates are calculated from the information entered and published rules. This is information, not legal advice — confirm with official notices and a licensed professional.</p>
  </body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share status report' });
}
