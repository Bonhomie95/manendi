import { Platform } from 'react-native';
import { t } from './i18n';
import type { DocKind } from './store';
import type { Status } from './rules';

/** What guards the vault, in each platform's own words. */
export const LOCK = Platform.OS === 'ios' ? 'Face ID' : t('meta.lock.android');

/** [SF Symbol, Material Symbol] per status family. */
export function statusIcon(s: Status): [string, string] {
  if (['F-1', 'OPT', 'STEM OPT', 'J-1'].includes(s)) return ['graduationcap.fill', 'school'];
  if (['H-1B', 'L-1', 'O-1', 'TN', 'E-3'].includes(s)) return ['briefcase.fill', 'work'];
  if (['H-4', 'L-2'].includes(s)) return ['person.2.fill', 'group'];
  if (s === 'B-1/B-2') return ['airplane', 'flight'];
  if (s.includes('Green card')) return ['creditcard.fill', 'badge'];
  return ['doc.text.fill', 'description'];
}

export const FORMS: Record<string, string> = {
  'I-765': t('meta.form.I-765'), 'I-485': t('meta.form.I-485'), 'I-130': t('meta.form.I-130'), 'I-140': t('meta.form.I-140'), 'I-129': t('meta.form.I-129'),
  'I-539': t('meta.form.I-539'), 'I-131': t('meta.form.I-131'), 'N-400': t('meta.form.N-400'), 'I-90': t('meta.form.I-90'),
  'I-751': t('meta.form.I-751'), 'I-129F': t('meta.form.I-129F'), 'I-821': 'TPS', 'I-589': t('meta.form.I-589'), 'I-526E': t('meta.form.I-526E'), 'I-829': t('meta.form.I-829'),
};

/** Plain-English meaning of the statuses USCIS shows most, and what usually comes next. */
const EXPLAIN: [RegExp, string, string][] = [
  [/request for (initial )?evidence was sent|rfe was sent/i, t('meta.explain.rfe'), t('meta.explain.rfe.next')],
  [/response .*evidence was received|evidence was received/i, t('meta.explain.rfeAnswered'), t('meta.explain.rfeAnswered.next')],
  [/fingerprint|biometric/i, t('meta.explain.biometrics'), t('meta.explain.biometrics.next')],
  [/interview was scheduled/i, t('meta.explain.interview'), t('meta.explain.interview.next')],
  [/interview was completed|case is ready to be scheduled/i, t('meta.explain.interviewDone'), t('meta.explain.interviewDone.next')],
  [/actively reviewed|being reviewed/i, t('meta.explain.review'), t('meta.explain.review.next')],
  [/transferred|new office has jurisdiction/i, t('meta.explain.transferred'), t('meta.explain.transferred.next')],
  [/approved|approval/i, t('meta.explain.approved'), t('meta.explain.approved.next')],
  [/card is being produced|card was produced/i, t('meta.explain.cardMade'), t('meta.explain.cardMade.next')],
  [/card was (mailed|picked up)|delivered/i, t('meta.explain.cardMailed'), t('meta.explain.cardMailed.next')],
  [/rejected/i, t('meta.explain.rejected'), t('meta.explain.rejected.next')],
  [/denied/i, t('meta.explain.denied'), t('meta.explain.denied.next')],
  [/returned to uscis|notice was returned/i, t('meta.explain.returned'), t('meta.explain.returned.next')],
  [/received/i, t('meta.explain.received'), t('meta.explain.received.next')],
];
export function explain(status: string | null | undefined): { meaning: string; next: string } | null {
  if (!status) return null;
  const hit = EXPLAIN.find(([re]) => re.test(status));
  return hit ? { meaning: hit[1], next: hit[2] } : null;
}

/** For logging an update by hand while live status is off. */
export const COMMON_STATUSES = [
  'Case Was Received', 'Fingerprints Were Taken', 'Interview Was Scheduled', 'Request for Evidence Was Sent',
  'Response To USCIS Request For Evidence Was Received', 'Case Is Being Actively Reviewed By USCIS', 'Case Was Approved',
  'New Card Is Being Produced', 'Card Was Mailed To Me', 'Case Was Denied',
];

export const DOC_KINDS: [DocKind, string, string, string][] = [
  ['passport', t('meta.doc.passport'), 'book.closed.fill', 'menu_book'], ['visa', t('meta.doc.visa'), 'checkmark.seal.fill', 'verified'],
  ['i94', 'I-94', 'airplane.arrival', 'flight_land'], ['i20', 'I-20 / DS-2019', 'graduationcap.fill', 'school'],
  ['ead', t('meta.doc.ead'), 'person.text.rectangle.fill', 'badge'], ['i797', t('meta.doc.i797'), 'doc.text.fill', 'description'],
  ['green card', t('meta.doc.greenCard'), 'creditcard.fill', 'credit_card'], ['other', t('meta.doc.other'), 'paperclip', 'attach_file'],
];

/** Before you fly: what people usually carry, per status. Information, not advice. */
export function packing(s: Status): string[] {
  const base = [t('meta.packing.passport')];
  switch (s) {
    case 'F-1': return [...base, t('meta.packing.f1.visa'), t('meta.packing.f1.i20'), t('meta.packing.f1.funding')];
    case 'OPT': case 'STEM OPT': return [...base, t('meta.packing.opt.visa'), t('meta.packing.opt.i20'), t('meta.packing.opt.ead'), t('meta.packing.opt.job')];
    case 'J-1': return [...base, t('meta.packing.j1.visa'), t('meta.packing.j1.ds2019')];
    case 'H-1B': case 'L-1': case 'O-1': case 'TN': case 'E-3': return [...base, t('meta.packing.work.visa'), t('meta.packing.work.i797'), t('meta.packing.work.letter')];
    case 'H-4': case 'L-2': return [...base, t('meta.packing.family.visa'), t('meta.packing.family.i797'), t('meta.packing.family.marriage')];
    case 'Green card pending': return [...base, t('meta.packing.pending.ap')];
    case 'Green card': case 'Conditional green card': return [t('meta.packing.gc.passport'), t('meta.packing.gc.card'), t('meta.packing.gc.trips')];
    case 'B-1/B-2': return [...base, t('meta.packing.visitor.visa'), t('meta.packing.visitor.ticket')];
    default: return [...base, t('meta.packing.other')];
  }
}
