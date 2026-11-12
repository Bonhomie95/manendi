import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { headline } from '@/components/clock-card';
import { SignIn } from '@/components/sign-in';
import { Appear, Avatar, Card, CountUp, Icon, Row, Screen, T, Tap, toast } from '@/components/ui';
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
  const { data, all, plus, watches, update, eraseServer, eraseAll, signOut, deleteAccount } = useStore();
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
  const store = Platform.OS === 'ios' ? 'Apple Account' : 'Google Play';
  const run = (fn: () => Promise<void>, ok: string) => async () => { try { await fn(); toast(ok); } catch (e) { toast((e as Error).message); } };
  const account = data.account;
  const manageAccount = () => Alert.alert(account?.email ?? account?.name ?? 'Your account',
    'Your household backs up here, so a new phone gets it back when you sign in. Document photos stay on this phone.', [
      { text: 'Sign out', onPress: run(signOut, 'Signed out. Everything stays on this phone.') },
      { text: 'Delete account', style: 'destructive', onPress: () => Alert.alert('Delete your account?',
        `Deletes its backup, email and name from Manendi’s server now. This phone keeps its data. Manendi Plus keeps billing until you cancel it in your ${store} settings.`,
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: run(deleteAccount, 'Account deleted.') }]) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  const backedUp = account?.backupAt
    ? `Backed up ${new Date(account.backupAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
    : 'Backing up…';
  const confirmErase = (all: boolean) => Alert.alert(
    all ? 'Erase everything?' : 'Erase your server data?',
    all ? 'Deletes every person, date, trip, document and case on this phone, plus what Manendi’s server holds. This can’t be undone.'
      : `Deletes your watched cases${account ? ', your account and its backup' : ''} and this device’s record from Manendi’s server now. Your dates on this phone stay.`,
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
      {people.map((p, i) => {
        const top = all.find((x) => x.personId === p.id && x.level !== 'info');
        const big = top && headline(top);
        const [ios, android] = statusIcon(p.status);
        return (
          <Appear key={p.id} i={i}><Tap onPress={() => router.push({ pathname: '/person', params: { id: p.id } })} accessibilityLabel={`${p.name}, ${p.status}`}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Avatar name={p.name} color={[c.accent, c.alt, c.gold, '#5B6CFF'][people.indexOf(p) % 4]} size={46} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="strong">{p.name}{p.relation === 'me' ? ' (you)' : ''}</T>
                <Row style={{ gap: 6 }}><Icon ios={ios} android={android} size={13} color={c.muted} /><T v="small" muted>{p.status}</T></Row>
                {top && <T v="small" color={levelColor(c, top.level)} numberOfLines={1}>{top.title}{top.date ? ` · ${full(top.date)}` : ''}</T>}
              </View>
              {big && <View style={{ alignItems: 'flex-end' }}><CountUp v="h2" color={levelColor(c, top!.level)} value={big.value} /><T v="small" muted style={{ fontSize: 11 }}>{big.unit}</T></View>}
            </Card>
          </Tap></Appear>
        );
      })}
      <Tap onPress={() => router.push(plus || people.length < 1 ? { pathname: '/person', params: { id: 'new' } } : '/plan')} accessibilityLabel="Add someone">
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderStyle: 'dashed', borderWidth: 1.5, boxShadow: 'none', backgroundColor: 'transparent' }}>
          <Icon ios="person.crop.circle.badge.plus" android="person_add" size={22} color={c.accent} />
          <T v="strong" color={c.accent} style={{ flex: 1 }}>Add a spouse, child or parent</T>
          {!plus && <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: tint(c.gold, 0.18) }}><T v="label" color={c.gold} style={{ fontSize: 10 }}>Plus</T></View>}
        </Card>
      </Tap>

      <Appear i={2}>
        <Card style={{ gap: 0, paddingVertical: 8 }}>
          <Item ios="crown.fill" android="workspace_premium" title={plus ? 'Manendi Plus is on' : 'Manendi Plus'}
            sub={plus ? (data.plan.until ? `Renews or ends ${full(data.plan.until.slice(0, 10))}` : 'Active') : 'Family, unlimited cases, citizenship budget, vault'} onPress={() => go('/plan')} />
          <Item ios="lock.doc.fill" android="lock" title="Document vault" sub={`Passports, I-797s and cards behind ${LOCK}`} plusOnly={!plus} onPress={() => go('/vault')} />
          <Item ios="doc.richtext" android="picture_as_pdf" title={busy ? 'Preparing…' : 'Status report (PDF)'} sub="Every date and case on one page, for your attorney or HR" plusOnly={!plus} onPress={report} />
          <Item ios={data.reminders ? 'bell.badge.fill' : 'bell.slash'} android={data.reminders ? 'notifications_active' : 'notifications_off'}
            title={data.reminders ? 'Reminders are on' : 'Turn on reminders'} sub="90, 30, 7 and 1 day before each date. Works offline." onPress={reminders} />
        </Card>
      </Appear>

      <Appear i={3}>
        {account ? (
          <Card style={{ gap: 0, paddingVertical: 8 }}>
            <Item ios="checkmark.icloud.fill" android="cloud_done" title={account.email ?? account.name ?? 'Signed in'} sub={backedUp} onPress={manageAccount} />
          </Card>
        ) : (
          <Card style={{ gap: 14 }}>
            <View style={{ gap: 4 }}>
              <T v="strong">Back up your household</T>
              <T v="small" muted>Optional. Sign in to get everyone’s dates and cases back on any phone. Document photos never leave this one.</T>
            </View>
            <SignIn />
          </Card>
        )}
      </Appear>

      <Appear i={4}>
        <Card style={{ gap: 0, paddingVertical: 8 }}>
          <Item ios="hand.raised.fill" android="privacy_tip" title="Privacy" sub={account ? 'Backed up to your account; photos stay here' : 'Your details stay on this phone'} onPress={() => openPage('privacy')} />
          <Item ios="doc.plaintext" android="gavel" title="Terms" onPress={() => openPage('terms')} />
          <Item ios="questionmark.bubble.fill" android="support_agent" title="Support" onPress={() => openPage('support')} />
        </Card>
      </Appear>

      <Appear i={5}>
        <Card style={{ gap: 0, paddingVertical: 8 }}>
          <Item ios="icloud.slash" android="cloud_off" title="Erase my server data" sub={account ? 'Cases, account and backup, device record' : 'Watched cases and this device’s record'} onPress={() => confirmErase(false)} danger />
          <Item ios="trash.fill" android="delete_forever" title="Erase everything" sub="Everything on this phone, too" onPress={() => confirmErase(true)} danger />
        </Card>
      </Appear>

      <T v="small" muted style={{ textAlign: 'center' }}>Manendi {Constants.expoConfig?.version} · Information, not legal advice.</T>
    </Screen>
  );
}
