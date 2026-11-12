import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { headline } from '@/components/clock-card';
import { Avatar, Card, Icon, Row, Screen, T, Tap, toast } from '@/components/ui';
import { openPage } from '@/lib/api';
import { full } from '@/lib/dates';
import { LOCK, statusIcon } from '@/lib/meta';
import { enableReminders } from '@/lib/notify';
import { shareReport } from '@/lib/report';
import { useStore } from '@/lib/store';
import { levelColor, tint, useColors } from '@/lib/theme';

function Item({ ios, android, title, sub, onPress, plusOnly, danger }: {
  ios: string; android: string; title: string; sub?: string; onPress: () => void; plusOnly?: boolean; danger?: boolean;
}) {
  const c = useColors();
  const col = danger ? c.danger : c.accent;
  return (
    <Tap onPress={onPress} accessibilityLabel={title}>
      <Row style={{ gap: 14, paddingVertical: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: tint(col, 0.13), alignItems: 'center', justifyContent: 'center' }}>
          <Icon ios={ios} android={android} size={17} color={col} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="strong" color={danger ? c.danger : undefined}>{title}</T>
          {sub ? <T v="small" muted>{sub}</T> : null}
        </View>
        {plusOnly && <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: tint(c.gold, 0.18) }}><T v="label" color={c.gold} style={{ fontSize: 10 }}>Plus</T></View>}
        <Icon ios="chevron.right" android="chevron_right" size={13} color={c.muted} />
      </Row>
    </Tap>
  );
}

export default function Family() {
  const c = useColors();
  const { data, all, plus, watches, update, eraseServer, eraseAll } = useStore();
  const [busy, setBusy] = useState(false);
  const people = data.people;
  const go = (path: '/vault' | '/plan') => router.push(plus || path === '/plan' ? path : '/plan');

  async function reminders() {
    if (data.reminders) { update((d) => ({ ...d, reminders: false })); return toast('Reminders off.'); }
    const ok = await enableReminders();
    if (!ok) return toast('Notifications are off for Manendi in Settings.');
    update((d) => ({ ...d, reminders: true }));
    toast('Reminders on: 90, 30, 7 and 1 day before each date.');
  }
  async function report() {
    if (!plus) return router.push('/plan');
    setBusy(true);
    try { await shareReport(people, all, data.cases, watches); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  }
  const confirmErase = (all: boolean) => Alert.alert(
    all ? 'Erase everything?' : 'Erase your server data?',
    all ? 'Deletes every person, date, trip, document and case on this phone, plus what Manendi’s server holds. This can’t be undone.'
      : 'Deletes your watched cases and device record from Manendi’s server now. Your dates on this phone stay.',
    [{ text: 'Cancel', style: 'cancel' }, {
      text: 'Erase', style: 'destructive', onPress: async () => {
        try { await (all ? eraseAll() : eraseServer()); toast(all ? 'Erased.' : 'Server data erased.'); }
        catch (e) { toast((e as Error).message); }
      },
    }],
  );

  return (
    <Screen>
      <T v="title" style={{ marginTop: 4 }}>Family</T>
      {people.map((p) => {
        const top = all.find((x) => x.personId === p.id && x.level !== 'info');
        const big = top && headline(top);
        const [ios, android] = statusIcon(p.status);
        return (
          <Tap key={p.id} onPress={() => router.push({ pathname: '/person', params: { id: p.id } })} accessibilityLabel={`${p.name}, ${p.status}`}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Avatar name={p.name} color={[c.accent, c.alt, c.gold, '#5B6CFF'][people.indexOf(p) % 4]} size={46} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="strong">{p.name}{p.relation === 'me' ? ' (you)' : ''}</T>
                <Row style={{ gap: 6 }}><Icon ios={ios} android={android} size={13} color={c.muted} /><T v="small" muted>{p.status}</T></Row>
                {top && <T v="small" color={levelColor(c, top.level)} numberOfLines={1}>{top.title}{top.date ? ` · ${full(top.date)}` : ''}</T>}
              </View>
              {big && <View style={{ alignItems: 'flex-end' }}><T v="h2" color={levelColor(c, top!.level)}>{big.n}</T><T v="small" muted style={{ fontSize: 11 }}>{big.unit}</T></View>}
            </Card>
          </Tap>
        );
      })}
      <Tap onPress={() => router.push(plus || people.length < 1 ? { pathname: '/person', params: { id: 'new' } } : '/plan')} accessibilityLabel="Add someone">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderStyle: 'dashed', borderWidth: 1.5, boxShadow: 'none', backgroundColor: 'transparent' }}>
          <Icon ios="person.crop.circle.badge.plus" android="person_add" size={22} color={c.accent} />
          <T v="strong" color={c.accent} style={{ flex: 1 }}>Add a spouse, child or parent</T>
          {!plus && <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: tint(c.gold, 0.18) }}><T v="label" color={c.gold} style={{ fontSize: 10 }}>Plus</T></View>}
        </Card>
      </Tap>

      <Card style={{ gap: 0, paddingVertical: 8 }}>
        <Item ios="crown.fill" android="workspace_premium" title={plus ? 'Manendi Plus is on' : 'Manendi Plus'}
          sub={plus ? (data.plan.until ? `Renews or ends ${full(data.plan.until.slice(0, 10))}` : 'Active') : 'Family, unlimited cases, citizenship budget, vault'} onPress={() => go('/plan')} />
        <Item ios="lock.doc.fill" android="lock" title="Document vault" sub={`Passports, I-797s and cards behind ${LOCK}`} plusOnly={!plus} onPress={() => go('/vault')} />
        <Item ios="doc.richtext" android="picture_as_pdf" title={busy ? 'Preparing…' : 'Status report (PDF)'} sub="Every date and case on one page, for your attorney or HR" plusOnly={!plus} onPress={report} />
        <Item ios={data.reminders ? 'bell.badge.fill' : 'bell.slash'} android={data.reminders ? 'notifications_active' : 'notifications_off'}
          title={data.reminders ? 'Reminders are on' : 'Turn on reminders'} sub="90, 30, 7 and 1 day before each date. Works offline." onPress={reminders} />
      </Card>

      <Card style={{ gap: 0, paddingVertical: 8 }}>
        <Item ios="hand.raised.fill" android="privacy_tip" title="Privacy" sub="Your details stay on this phone" onPress={() => openPage('privacy')} />
        <Item ios="doc.plaintext" android="gavel" title="Terms" onPress={() => openPage('terms')} />
        <Item ios="questionmark.bubble.fill" android="support_agent" title="Support" onPress={() => openPage('support')} />
      </Card>

      <Card style={{ gap: 0, paddingVertical: 8 }}>
        <Item ios="icloud.slash" android="cloud_off" title="Erase my server data" sub="Watched cases and this device’s record" onPress={() => confirmErase(false)} danger />
        <Item ios="trash.fill" android="delete_forever" title="Erase everything" sub="Everything on this phone, too" onPress={() => confirmErase(true)} danger />
      </Card>

      <T v="small" muted style={{ textAlign: 'center' }}>Manendi {Constants.expoConfig?.version} · Information, not legal advice.</T>
    </Screen>
  );
}
