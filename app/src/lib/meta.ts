import { Platform } from 'react-native';
import type { DocKind } from './store';
import type { Status } from './rules';

/** What guards the vault, in each platform's own words. */
export const LOCK = Platform.OS === 'ios' ? 'Face ID' : 'your screen lock';

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
  'I-765': 'Work permit', 'I-485': 'Green card', 'I-130': 'Family petition', 'I-140': 'Employer petition', 'I-129': 'Worker petition',
  'I-539': 'Extend or change stay', 'I-131': 'Travel document', 'N-400': 'Citizenship', 'I-90': 'Green card renewal',
  'I-751': 'Remove conditions', 'I-129F': 'Fiancé(e) petition', 'I-821': 'TPS', 'I-589': 'Asylum', 'I-526E': 'EB-5 investor', 'I-829': 'EB-5 conditions',
};

/** Plain-English meaning of the statuses USCIS shows most, and what usually comes next. */
const EXPLAIN: [RegExp, string, string][] = [
  [/request for (initial )?evidence was sent|rfe was sent/i, 'USCIS needs more documents.', 'The notice has a deadline. Answer everything it asks, before that date.'],
  [/response .*evidence was received|evidence was received/i, 'USCIS has your answer to their request.', 'Review picks back up. A decision usually follows.'],
  [/fingerprint|biometric/i, 'Biometrics are done or booked.', 'Bring the appointment notice and your ID. After this the file goes to review.'],
  [/interview was scheduled/i, 'You have an interview.', 'The notice has the date and place. Bring originals of everything you filed.'],
  [/interview was completed|case is ready to be scheduled/i, 'The interview step is moving.', 'A decision or a request for more evidence usually comes next.'],
  [/actively reviewed|being reviewed/i, 'An officer is working on your case.', 'This can last weeks or months. No action needed unless USCIS writes to you.'],
  [/transferred|new office has jurisdiction/i, 'Your case moved to another office.', 'Normal and usually to balance workloads. Your dates don’t change.'],
  [/approved|approval/i, 'Approved.', 'An approval notice is on its way. Cards are produced and mailed after it.'],
  [/card is being produced|card was produced/i, 'Your card is being made.', 'It usually ships within a few weeks.'],
  [/card was (mailed|picked up)|delivered/i, 'Your card is in the mail or delivered.', 'Check it for mistakes right away and report any.'],
  [/rejected/i, 'Your filing was sent back.', 'Usually a missing fee, signature or field. Fix it and file again quickly.'],
  [/denied/i, 'Your case was denied.', 'The notice explains why and whether you can appeal. Talk to an attorney soon.'],
  [/returned to uscis|notice was returned/i, 'Mail from USCIS couldn’t reach you.', 'Update your address with USCIS (Form AR-11) right away.'],
  [/received/i, 'USCIS has your filing.', 'A receipt notice is mailed. Biometrics or review usually come next.'],
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
  ['passport', 'Passport', 'book.closed.fill', 'menu_book'], ['visa', 'Visa stamp', 'checkmark.seal.fill', 'verified'],
  ['i94', 'I-94', 'airplane.arrival', 'flight_land'], ['i20', 'I-20 / DS-2019', 'graduationcap.fill', 'school'],
  ['ead', 'Work permit (EAD)', 'person.text.rectangle.fill', 'badge'], ['i797', 'Approval notice (I-797)', 'doc.text.fill', 'description'],
  ['green card', 'Green card', 'creditcard.fill', 'credit_card'], ['other', 'Other', 'paperclip', 'attach_file'],
];

/** Before you fly: what people usually carry, per status. Information, not advice. */
export function packing(s: Status): string[] {
  const base = ['Passport valid at least 6 months past your return'];
  switch (s) {
    case 'F-1': return [...base, 'Valid F-1 visa stamp (or a stamping appointment abroad)', 'I-20 with a travel signature from the last 12 months', 'Proof of enrollment and funding'];
    case 'OPT': case 'STEM OPT': return [...base, 'Valid F-1 visa stamp', 'I-20 with a travel signature from the last 6 months', 'EAD card', 'Job offer or employment letter'];
    case 'J-1': return [...base, 'Valid J-1 visa stamp', 'DS-2019 signed for travel by your sponsor'];
    case 'H-1B': case 'L-1': case 'O-1': case 'TN': case 'E-3': return [...base, 'Valid visa stamp, or a stamping appointment abroad', 'Latest I-797 approval notice', 'Employment letter and recent pay stubs'];
    case 'H-4': case 'L-2': return [...base, 'Valid visa stamp', 'Your and your spouse’s latest I-797 notices', 'Marriage certificate'];
    case 'Green card pending': return [...base, 'Advance parole document, unless you keep valid H or L status — leaving without it can abandon your I-485'];
    case 'Green card': case 'Conditional green card': return ['Valid passport from your country', 'Green card (or I-551 stamp / extension notice)', 'Trips under 6 months protect continuous residence; a re-entry permit for 1 year or longer'];
    case 'B-1/B-2': return [...base, 'Valid visa or ESTA', 'Return ticket'];
    default: return [...base, 'Your current status documents'];
  }
}
