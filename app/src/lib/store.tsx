// Everything about a person — statuses, dates, jobs, trips, documents — lives in one JSON file on this phone.
// The API sees receipt numbers someone chose to watch and, only if they sign in, a backup of the household (never
// document photos) so a new phone gets it back. Device backups carry the file to a new phone too.
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Token } from './account';
import { api, ApiError, type Account, type PlanView, type Watch } from './api';
import { startBilling, switchUser } from './billing';
import { today } from './dates';
import { scheduleReminders } from './notify';
import { byUrgency, clocks, type Clock, type Person } from './rules';

export type DocKind = 'passport' | 'visa' | 'i94' | 'i20' | 'ead' | 'i797' | 'green card' | 'other';
export type Doc = { id: string; personId: string; kind: DocKind; title: string; expires?: string; files: string[]; addedAt: string };
/** A case on this phone: who it belongs to, plus any updates logged by hand. Live status comes from the API. */
export type CaseLink = { receipt: string; personId: string; label: string; log: { status: string; date: string }[] };
export type Data = {
  v: 1;
  userId: string; // RevenueCat's app user ID — travels with backups, so a purchase follows the person to a new phone
  people: Person[];
  cases: CaseLink[];
  docs: Doc[];
  plan: { plus: boolean; until: string | null; source: string | null };
  reminders: boolean;
  account: Account | null;
};
/** What an account keeps: the household as this phone has it, minus documents (their photos never leave the phone). */
export type Backup = { people: Person[]; cases: CaseLink[]; at: string };

const FILE = new File(Paths.document, 'manendi.json');
const blank = (): Data => ({ v: 1, userId: Crypto.randomUUID(), people: [], cases: [], docs: [], plan: { plus: false, until: null, source: null }, reminders: false, account: null });
function load(): Data {
  try { return FILE.exists ? { ...blank(), ...JSON.parse(FILE.textSync()) } : blank(); } catch { return blank(); }
}

export const newId = () => Crypto.randomUUID();
/** Document photos live in the app's private folder, never on the server. */
export const vaultFile = (name: string) => new File(Paths.document, 'vault', name);

type Ctx = {
  data: Data;
  plus: boolean;
  me: Person | undefined;
  /** Every clock for everyone, most pressing first. */
  all: Clock[];
  watches: Watch[];
  live: { on: boolean; mock: boolean };
  testMode: boolean;
  update: (fn: (d: Data) => Data) => void;
  savePerson: (p: Person) => void;
  removePerson: (id: string) => void;
  setPlan: (p: PlanView) => void;
  sync: () => Promise<void>;
  /** Signs in with a provider token. `choose` decides between an account backup and this phone's data; true = restored. */
  signIn: (t: Token, choose: (b: Backup) => Promise<boolean>) => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  eraseServer: () => Promise<void>;
  eraseAll: () => Promise<void>;
};
const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(load);
  const [watches, setWatches] = useState<Watch[]>([]);
  const [live, setLive] = useState({ on: false, mock: false });
  const [testMode, setTestMode] = useState(false);
  const dataRef = useRef(data);

  const update = useCallback((fn: (d: Data) => Data) => setData(fn), []);
  // ponytail: whole-file writes on every change; fine at this size (a family's dates are a few KB)
  useEffect(() => {
    dataRef.current = data;
    try { if (!FILE.exists) FILE.create(); FILE.writeSync(JSON.stringify(data)); } catch (e) { console.warn('manendi: could not save', e); }
  }, [data]);

  const setPlan = useCallback((p: PlanView) => {
    update((d) => ({ ...d, plan: { plus: p.plus, until: p.expiresAt, source: p.source } }));
  }, [update]);

  // Plan + watched cases from the API. Cases this phone knows but the server doesn't (new phone, erased data) re-attach.
  const sync = useCallback(async () => {
    try {
      const d = dataRef.current;
      const plan = await api<PlanView>('/device', { body: { appUserId: d.userId } });
      setPlan(plan);
      setTestMode(!!plan.testMode);
      // The server knows if the account was deleted or this phone signed out elsewhere.
      if (plan.account !== undefined) update((x) => ({ ...x, account: plan.account ?? null }));
      let w = await api<{ live: boolean; mock: boolean; watches: Watch[] }>('/watch');
      const missing = d.cases.filter((c) => !w.watches.some((x) => x.receipt === c.receipt));
      if (missing.length) {
        for (const c of missing) await api('/watch', { body: { receipt: c.receipt, label: c.label } }).catch(() => {});
        w = await api('/watch');
      }
      setWatches(w.watches);
      setLive({ on: w.live, mock: w.mock });
    } catch (e) {
      if (!(e instanceof ApiError)) throw e; // offline: keep what we have
    }
  }, [setPlan, update]);

  // Signed in: each change reaches the account's backup a couple of seconds after the last edit.
  const signedIn = !!data.account;
  useEffect(() => {
    if (!signedIn) return;
    const t = setTimeout(() => {
      api<{ at: string }>('/account/backup', { method: 'PUT', body: { people: data.people, cases: data.cases } })
        .then(({ at }) => update((d) => (d.account ? { ...d, account: { ...d.account, backupAt: at } } : d)))
        .catch(() => {}); // offline: the next change or launch tries again
    }, 2000);
    return () => clearTimeout(t);
  }, [signedIn, data.people, data.cases, update]);

  const signIn = useCallback(async (t: Token, choose: (b: Backup) => Promise<boolean>) => {
    const d = dataRef.current;
    const r = await api<{ account: Account; userId: string | null; backup: Backup | null; plan: PlanView }>('/account', { body: { ...t, userId: d.userId } });
    if (r.userId && r.userId !== d.userId) await switchUser(r.userId);
    const restore = !!r.backup?.people.length && (!d.people.length || (await choose(r.backup)));
    const next: Data = {
      ...dataRef.current, userId: r.userId ?? d.userId, account: r.account,
      ...(restore && r.backup ? { people: r.backup.people, cases: r.backup.cases } : {}),
    };
    dataRef.current = next; // sync below re-attaches restored cases, so it must see them now
    setData(next);
    setPlan(r.plan);
    void sync();
    return restore;
  }, [setPlan, sync]);

  useEffect(() => {
    void sync();
    startBilling(dataRef.current.userId).catch(() => {});
    const sub = AppState.addEventListener('change', (s) => s === 'active' && sync());
    return () => sub.remove();
  }, [sync]);

  const plus = data.plan.plus && (!data.plan.until || new Date(data.plan.until) > new Date());
  const all = useMemo(() => {
    const t = today();
    return data.people.flatMap((p) => clocks(p, t)).sort(byUrgency);
  }, [data.people]);

  // Local reminders follow the clocks: rescheduled whenever a date changes.
  useEffect(() => { if (data.reminders) scheduleReminders(all, data.people).catch(() => {}); }, [all, data.people, data.reminders]);

  const value = useMemo<Ctx>(() => ({
    data, plus, all, watches, live, testMode, update, setPlan, sync, signIn,
    signOut: async () => {
      await api('/account/session', { method: 'DELETE' });
      update((d) => ({ ...d, account: null }));
    },
    deleteAccount: async () => {
      await api('/account', { method: 'DELETE' });
      update((d) => ({ ...d, account: null }));
    },
    me: data.people.find((p) => p.relation === 'me') ?? data.people[0],
    savePerson: (p) => update((d) => ({ ...d, people: d.people.some((x) => x.id === p.id) ? d.people.map((x) => (x.id === p.id ? p : x)) : [...d.people, p] })),
    removePerson: (id) => update((d) => ({
      ...d, people: d.people.filter((p) => p.id !== id), cases: d.cases.filter((c) => c.personId !== id), docs: d.docs.filter((x) => x.personId !== id),
    })),
    eraseServer: async () => {
      await api('/device', { method: 'DELETE' }); // the account and its backup go too
      setWatches([]);
      update((d) => ({ ...d, cases: [], account: null }));
    },
    eraseAll: async () => {
      await api('/device', { method: 'DELETE' }).catch(() => {});
      for (const doc of dataRef.current.docs) for (const f of doc.files) { try { vaultFile(f).delete(); } catch {} }
      setWatches([]);
      update((d) => ({ ...blank(), userId: d.userId }));
    },
  }), [data, plus, all, watches, live, testMode, update, setPlan, sync, signIn]);

  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useStore() {
  const c = use(StoreContext);
  if (!c) throw new Error('useStore needs <StoreProvider>');
  return c;
}
