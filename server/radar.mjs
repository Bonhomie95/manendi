// Policy radar: rules, proposed rules, notices and presidential documents that touch immigration, straight from the
// Federal Register's public API and tagged by who they affect. No editorial layer — every card links the document.
const FR = 'https://www.federalregister.gov/api/v1/documents.json';
const FIELDS = ['title', 'type', 'abstract', 'document_number', 'html_url', 'publication_date', 'agencies', 'effective_on', 'comments_close_on'];
const AGENCIES = [
  'u-s-citizenship-and-immigration-services', 'executive-office-for-immigration-review', 'u-s-immigration-and-customs-enforcement',
  'employment-and-training-administration', 'state-department',
]; // CBP is mostly trade; its immigration rules carry DHS too, so the DHS query below finds them

/** [tag, pattern] — the app maps each status to the tags that matter to it (src/lib/rules.ts → TAGS). */
export const TAGS = [
  ['H-1B', /\bH-1B\b|specialty occupation/i],
  ['H-4', /\bH-4\b/i],
  ['L-1', /\bL-1\b|intracompany transferee/i],
  ['O-1', /\bO-1\b|extraordinary ability/i],
  ['students', /\bF-1\b|\bstudents?\b|\bSEVP\b|\bSEVIS\b|duration of status/i],
  ['OPT', /practical training|\bOPT\b/i],
  ['work permits', /employment authori[sz]ation|\bEADs?\b|work permits?/i],
  ['work visas', /nonimmigrant workers?|temporary workers?|grace period|\bH-2[AB]\b|labor condition|prevailing wage|labor certification|\bPERM\b/i],
  ['green cards', /adjustment of status|lawful permanent|permanent residen|immigrant visas?|green cards?|\bI-485\b|\bI-140\b|\bEB-[1-5]\b|diversity visa/i],
  ['citizenship', /naturali[sz]ation|citizenship|\bN-400\b/i],
  ['travel & entry', /entry of (?:certain )?(?:aliens?|immigrants?|nonimmigrants?|nationals?|foreign)|admission|travel (?:ban|authori[sz]ation|restriction)|consular|visa (?:issuance|interview|waiver|bond)|\bESTA\b|entry-exit|biometric/i],
  ['fees', /\bfees?\b/i],
  ['humanitarian', /asylum|refugee|temporary protected status|\bTPS\b|\bparole\b|\bDACA\b|deferred action/i],
  ['exchange visitors', /\bJ-1\b|exchange visitor/i],
  ['visitors', /\bB-1\b|\bB-2\b|visitor visa/i],
  ['courts & enforcement', /\bremoval\b(?!\s+of\b)|deportation|detention|immigration court|immigration judge/i], // "Removal of X" means repealing X
];
// Paperwork-burden notices and meetings are most of the Register's volume and none of a reader's business.
const NOISE = /information collection|privacy act of 1974|sunshine act|\bmeetings?\b|paperwork reduction|currently approved collection|new collection|lightering|coast guard|importers?\b|shipments?|cargo|vessels?|tariffs?|de minimis|customs broker|merchandise|drawback|informal entry/i;

export const tag = (d) => {
  const text = `${d.title ?? ''} ${d.abstract ?? ''}`;
  const tags = TAGS.filter(([, re]) => re.test(text)).map(([t]) => t);
  return tags.length === 1 && tags[0] === 'fees' ? [] : tags; // a fee notice alone could be for anything
};

/** Dedupe, drop noise, tag, keep what touches immigration, newest first. */
export function shape(docs, limit = 80) {
  const seen = new Set();
  const out = [];
  for (const d of docs) {
    if (!d?.document_number || seen.has(d.document_number) || NOISE.test(d.title ?? '')) continue;
    seen.add(d.document_number);
    const tags = tag(d);
    if (!tags.length) continue;
    out.push({
      id: d.document_number, title: d.title, type: d.type, abstract: d.abstract ?? '', url: d.html_url, date: d.publication_date,
      agencies: (d.agencies ?? []).map((a) => a.name ?? a.raw_name).filter(Boolean),
      effective: d.effective_on ?? null, commentsClose: d.comments_close_on ?? null, tags,
    });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, limit);
}

const qs = (pairs) => pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

export async function fetchRadar(since, get = fetch) {
  const base = [['per_page', '100'], ['order', 'newest'], ['conditions[publication_date][gte]', since], ...FIELDS.map((f) => ['fields[]', f])];
  const queries = [
    [...base, ...AGENCIES.map((a) => ['conditions[agencies][]', a]), ...['RULE', 'PRORULE', 'NOTICE'].map((t) => ['conditions[type][]', t])],
    [...base, ['conditions[type][]', 'PRESDOCU'], ['conditions[term]', 'immigration | visa | aliens | nonimmigrant']],
    // DHS-only rules (no USCIS co-sign) — the term keeps the Coast Guard's marine notices out.
    [...base, ['conditions[agencies][]', 'homeland-security-department'], ['conditions[term]', 'immigration | nonimmigrant | employment authorization | asylum | parole']],
  ];
  const pages = await Promise.all(queries.map(async (q) => {
    const r = await get(`${FR}?${qs(q)}`, { headers: { accept: 'application/json', 'user-agent': 'Manendi/1.0 (policy radar)' } });
    if (!r.ok) throw new Error(`Federal Register ${r.status}`);
    return (await r.json()).results ?? [];
  }));
  return shape(pages.flat());
}
