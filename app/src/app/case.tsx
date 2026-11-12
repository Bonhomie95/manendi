import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Sheet } from '@/components/sheet';
import { Appear, Button, Card, Chip, Field, Icon, Row, T, Tap, toast } from '@/components/ui';
import { api, ApiError, needsPlus, openLink, type Watch } from '@/lib/api';
import { full, today } from '@/lib/dates';
import { COMMON_STATUSES, FORMS, explain } from '@/lib/meta';
import { useStore } from '@/lib/store';
import { font, tint, useColors } from '@/lib/theme';

const clean = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');

function AddCase() {
  const { data, update, sync, me } = useStore();
  const [receipt, setReceipt] = useState('');
  const [label, setLabel] = useState('');
  const [personId, setPersonId] = useState(me?.id ?? data.people[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const r = clean(receipt);
  const ok = /^[A-Z]{3}\d{10}$/.test(r);

  async function add() {
    setBusy(true);
    const link = { receipt: r, personId, label: label.trim(), log: [] };
    try {
      await api<Watch>('/watch', { body: { receipt: r, label: link.label } });
    } catch (e) {
      setBusy(false);
      if (needsPlus(e)) return router.replace('/plan');
      if (!(e instanceof ApiError) || e.status !== 0) return toast((e as Error).message);
      toast('Saved. It connects when you’re back online.');
    }
    update((d) => ({ ...d, cases: [...d.cases.filter((x) => x.receipt !== r), link] }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await sync();
    router.replace({ pathname: '/case', params: { receipt: r } });
  }

  return (
    <Sheet title="Add a case" footer={<Button title="Watch this case" kind="accent" loading={busy} disabled={!ok || !personId} onPress={add} />}>
      <Field label="Receipt number" value={receipt} onChangeText={setReceipt} placeholder="IOE0912345678" autoCapitalize="characters" autoCorrect={false} autoFocus maxLength={16} />
      <T v="small" muted>Three letters and ten digits, top left of any USCIS notice. Only add cases that are yours or that someone asked you to track.</T>
      <Field label="Label (optional)" value={label} onChangeText={setLabel} placeholder={`e.g. ${data.people.find((x) => x.id === personId)?.name ?? 'Ada'} · work permit renewal`} maxLength={60} />
      {data.people.length > 1 && (
        <View style={{ gap: 8 }}>
          <T v="label">Whose case</T>
          <Row style={{ flexWrap: 'wrap' }}>{data.people.map((p) => <Chip key={p.id} label={p.name} on={personId === p.id} onPress={() => setPersonId(p.id)} />)}</Row>
        </View>
      )}
    </Sheet>
  );
}

function CaseView({ receipt }: { receipt: string }) {
  const c = useColors();
  const { data, watches, live, update, sync } = useStore();
  const [busy, setBusy] = useState(false);
  const [logging, setLogging] = useState(false);
  const link = data.cases.find((x) => x.receipt === receipt);
  const w = watches.find((x) => x.receipt === receipt);
  if (!link) return <Sheet title="Case" footer={null}><T muted>This case was removed.</T></Sheet>;
  const status = w?.status ?? link.log[0]?.status ?? null;
  const ex = explain(status);
  const timeline = [
    ...(w?.history ?? []).map((h) => ({ ...h, by: 'USCIS' })),
    ...link.log.map((h) => ({ ...h, by: 'You' })),
  ].sort((a, b) => ((b.date ?? '') > (a.date ?? '') ? 1 : -1));

  async function refresh() {
    setBusy(true);
    try { await api(`/watch/${receipt}/refresh`, { method: 'POST' }); await sync(); toast('Up to date.'); }
    catch (e) { toast((e as Error).message); }
    finally { setBusy(false); }
  }
  function log(s: string) {
    update((d) => ({ ...d, cases: d.cases.map((x) => (x.receipt === receipt ? { ...x, log: [{ status: s, date: today() }, ...x.log] } : x)) }));
    setLogging(false);
    toast('Logged.');
  }
  function remove() {
    Alert.alert('Stop watching this case?', 'It stays at USCIS. Manendi just stops tracking it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await api(`/watch/${receipt}`, { method: 'DELETE' }).catch(() => {});
        update((d) => ({ ...d, cases: d.cases.filter((x) => x.receipt !== receipt) }));
        await sync();
        router.back();
      } },
    ]);
  }

  return (
    <Sheet title={link.label || 'Case'} footer={
      <Row style={{ gap: 10 }}>
        {live.on && <Button title="Refresh" kind="soft" loading={busy} onPress={refresh} style={{ flex: 1 }} />}
        <Button title="Check on USCIS" kind="accent" onPress={() => openLink('https://egov.uscis.gov/')} style={{ flex: 1 }} />
      </Row>
    }>
      <Row style={{ justifyContent: 'space-between' }}>
        <T selectable accessibilityHint="Long-press to copy" style={{ fontFamily: font.heavy, letterSpacing: 2, fontSize: 18 }}>{receipt}</T>
        {w?.form && <T v="small" muted>{w.form}{FORMS[w.form] ? ` · ${FORMS[w.form]}` : ''}</T>}
      </Row>
      <Card style={{ gap: 8 }}>
        <T v="label">Status</T>
        <T v="h2">{status ?? 'No status yet'}</T>
        {ex && <><T v="strong">{ex.meaning}</T><T muted>{ex.next}</T></>}
        {!!w?.detail && <T v="small" muted>{w.detail}</T>}
        {w?.modified && <T v="small" muted>USCIS updated it {full(w.modified)}</T>}
        {w?.error && <T v="small" color={c.warn}>{w.error}</T>}
      </Card>

      <Tap onPress={() => setLogging(!logging)} accessibilityLabel="Log an update">
        <Row><Icon ios="square.and.pencil" android="edit_note" size={18} color={c.accent} /><T v="strong" color={c.accent}>Log an update</T></Row>
      </Tap>
      {logging && (
        <Row style={{ flexWrap: 'wrap' }}>{COMMON_STATUSES.map((s) => <Chip key={s} label={s} onPress={() => log(s)} />)}</Row>
      )}

      {timeline.length > 0 && (
        <View style={{ gap: 12 }}>
          <T v="label">History</T>
          {timeline.map((h, i) => (
            <Appear key={i} i={i}><Row style={{ alignItems: 'flex-start', gap: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i ? c.line : c.accent, marginTop: 5 }} />
                {i < timeline.length - 1 && <View style={{ width: 2, height: 34, backgroundColor: c.line, marginTop: 2 }} />}
              </View>
              <View style={{ flex: 1 }}>
                <T v="strong" style={{ fontSize: 15 }}>{h.status}</T>
                <T v="small" muted>{h.date ? full(h.date) : 'Earlier'} · {h.by}</T>
              </View>
            </Row></Appear>
          ))}
        </View>
      )}

      <Tap onPress={remove} accessibilityLabel="Stop watching" style={{ alignSelf: 'center', paddingVertical: 8 }}>
        <T v="small" color={c.danger}>Stop watching this case</T>
      </Tap>
      <View style={{ height: 1, backgroundColor: tint(c.line, 0.5) }} />
      <T v="small" muted>Statuses come from USCIS’s official Case Status API. Always read the notices USCIS mails you; Manendi can’t change a USCIS deadline.</T>
    </Sheet>
  );
}

export default function CaseScreen() {
  const { receipt } = useLocalSearchParams<{ receipt?: string }>();
  return receipt ? <CaseView receipt={receipt} /> : <AddCase />;
}
