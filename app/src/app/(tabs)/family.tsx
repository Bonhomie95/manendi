import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { headline } from '@/components/clock-card';
import { SignIn } from '@/components/sign-in';
import { Appear, Avatar, Card, CountUp, Icon, Row, Screen, T, Tap, toast } from '@/components/ui';
import { openPage } from '@/lib/api';
import { full } from '@/lib/dates';
import { locale, t, type Key } from '@/lib/i18n';
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
    if (data.reminders) { update((d) => ({ ...d, reminders: false })); return toast(t('family.reminders.offToast')); }
    const ok = await enableReminders();
    if (!ok) return toast(t('family.reminders.blocked'));
    update((d) => ({ ...d, reminders: true }));
    toast(t('family.reminders.onToast'));
  }
  async function report() {
    if (!plus) return router.push('/plan');
    setBusy(true);
    try { await shareReport(people, data.cases, watches); } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  }
  const store = Platform.OS === 'ios' ? 'Apple Account' : 'Google Play';
  const run = (fn: () => Promise<void>, ok: string) => async () => { try { await fn(); toast(ok); } catch (e) { toast((e as Error).message); } };
  const account = data.account;
  const manageAccount = () => Alert.alert(account?.email ?? account?.name ?? t('family.account.title'),
    t('family.account.body'), [
      { text: t('family.account.signOut'), onPress: run(signOut, t('family.account.signedOut')) },
      { text: t('family.account.delete'), style: 'destructive', onPress: () => Alert.alert(t('family.delete.title'),
        t('family.delete.body', { store }),
        [{ text: t('family.cancel'), style: 'cancel' }, { text: t('family.delete.confirm'), style: 'destructive', onPress: run(deleteAccount, t('family.delete.done')) }]) },
      { text: t('family.cancel'), style: 'cancel' },
    ]);
  const backedUp = account?.backupAt
    ? t('family.account.backedUp', { when: new Date(account.backupAt).toLocaleString(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) })
    : t('family.account.backingUp');
  const confirmErase = (all: boolean) => Alert.alert(
    all ? t('family.erase.all.title') : t('family.erase.server.title'),
    all ? t('family.erase.all.body') : account ? t('family.erase.server.bodyAccount') : t('family.erase.server.body'),
    [{ text: t('family.cancel'), style: 'cancel' }, {
      text: t('family.erase.confirm'), style: 'destructive', onPress: async () => {
        try { await (all ? eraseAll() : eraseServer()); toast(all ? t('family.erase.all.done') : t('family.erase.server.done')); }
        catch (e) { toast((e as Error).message); }
      },
    }],
  );

  return (
    <Screen>
      <T v="title" style={{ marginTop: 4 }}>{t('tabs.family')}</T>
      {people.map((p, i) => {
        const top = all.find((x) => x.personId === p.id && x.level !== 'info');
        const big = top && headline(top);
        const [ios, android] = statusIcon(p.status);
        const status = t(`status.${p.status}` as Key);
        return (
          <Appear key={p.id} i={i}><Tap onPress={() => router.push({ pathname: '/person', params: { id: p.id } })} accessibilityLabel={t('family.person.a11y', { name: p.name, status })}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Avatar name={p.name} color={[c.accent, c.alt, c.gold, '#5B6CFF'][people.indexOf(p) % 4]} size={46} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="strong">{p.relation === 'me' ? t('family.person.me', { name: p.name }) : p.name}</T>
                <Row style={{ gap: 6 }}><Icon ios={ios} android={android} size={13} color={c.muted} /><T v="small" muted>{status}</T></Row>
                {top && <T v="small" color={levelColor(c, top.level)} numberOfLines={1}>{top.title}{top.date ? ` · ${full(top.date)}` : ''}</T>}
              </View>
              {big && <View style={{ alignItems: 'flex-end' }}><CountUp v="h2" color={levelColor(c, top!.level)} value={big.value} /><T v="small" muted style={{ fontSize: 11 }}>{big.unit}</T></View>}
            </Card>
          </Tap></Appear>
        );
      })}
      <Tap onPress={() => router.push(plus || people.length < 1 ? { pathname: '/person', params: { id: 'new' } } : '/plan')} accessibilityLabel={t('family.addSomeone')}>
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderStyle: 'dashed', borderWidth: 1.5, boxShadow: 'none', backgroundColor: 'transparent' }}>
          <Icon ios="person.crop.circle.badge.plus" android="person_add" size={22} color={c.accent} />
          <T v="strong" color={c.accent} style={{ flex: 1 }}>{t('family.addPerson')}</T>
          {!plus && <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: tint(c.gold, 0.18) }}><T v="label" color={c.gold} style={{ fontSize: 10 }}>Plus</T></View>}
        </Card>
      </Tap>

      <Appear i={2}>
        <Card style={{ gap: 0, paddingVertical: 8 }}>
          <Item ios="crown.fill" android="workspace_premium" title={plus ? t('family.plus.on') : 'Manendi Plus'}
            sub={plus ? (data.plan.until ? t('family.plus.renews', { date: full(data.plan.until.slice(0, 10)) }) : t('family.plus.active')) : t('family.plus.pitch')} onPress={() => go('/plan')} />
          <Item ios="lock.doc.fill" android="lock" title={t('family.vault.title')} sub={t('family.vault.sub', { lock: LOCK })} plusOnly={!plus} onPress={() => go('/vault')} />
          <Item ios="doc.richtext" android="picture_as_pdf" title={busy ? t('family.report.preparing') : t('family.report.title')} sub={t('family.report.sub')} plusOnly={!plus} onPress={report} />
          <Item ios={data.reminders ? 'bell.badge.fill' : 'bell.slash'} android={data.reminders ? 'notifications_active' : 'notifications_off'}
            title={data.reminders ? t('family.reminders.on') : t('family.reminders.turnOn')} sub={t('family.reminders.sub')} onPress={reminders} />
        </Card>
      </Appear>

      <Appear i={3}>
        {account ? (
          <Card style={{ gap: 0, paddingVertical: 8 }}>
            <Item ios="checkmark.icloud.fill" android="cloud_done" title={account.email ?? account.name ?? t('family.account.signedIn')} sub={backedUp} onPress={manageAccount} />
          </Card>
        ) : (
          <Card style={{ gap: 14 }}>
            <View style={{ gap: 4 }}>
              <T v="strong">{t('family.backup.title')}</T>
              <T v="small" muted>{t('family.backup.body')}</T>
            </View>
            <SignIn />
          </Card>
        )}
      </Appear>

      <Appear i={4}>
        <Card style={{ gap: 0, paddingVertical: 8 }}>
          <Item ios="hand.raised.fill" android="privacy_tip" title={t('family.privacy')} sub={account ? t('family.privacy.account') : t('family.privacy.local')} onPress={() => openPage('privacy')} />
          <Item ios="doc.plaintext" android="gavel" title={t('family.terms')} onPress={() => openPage('terms')} />
          <Item ios="questionmark.bubble.fill" android="support_agent" title={t('family.support')} onPress={() => openPage('support')} />
        </Card>
      </Appear>

      <Appear i={5}>
        <Card style={{ gap: 0, paddingVertical: 8 }}>
          <Item ios="icloud.slash" android="cloud_off" title={t('family.erase.server.item')} sub={account ? t('family.erase.server.subAccount') : t('family.erase.server.sub')} onPress={() => confirmErase(false)} danger />
          <Item ios="trash.fill" android="delete_forever" title={t('family.erase.all.item')} sub={t('family.erase.all.sub')} onPress={() => confirmErase(true)} danger />
        </Card>
      </Appear>

      <T v="small" muted style={{ textAlign: 'center' }}>{t('family.footer', { version: Constants.expoConfig?.version ?? '' })}</T>
    </Screen>
  );
}
