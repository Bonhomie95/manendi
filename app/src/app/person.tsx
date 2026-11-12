import * as Haptics from 'expo-haptics';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { DatesForm, StatusPicker, WORKING } from '@/components/person-form';
import { Sheet } from '@/components/sheet';
import { Button, Card, Chip, Field, Icon, Row, T, Tap } from '@/components/ui';
import { full } from '@/lib/dates';
import { ASK, type Person, type Status } from '@/lib/rules';
import { newId, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

const RELATIONS: [Person['relation'], string][] = [['me', 'Me'], ['spouse', 'Spouse'], ['child', 'Child'], ['parent', 'Parent'], ['other', 'Other']];
const CHARGE = ['All other countries', 'India', 'China (mainland)', 'Mexico', 'Philippines'];

export default function PersonScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, plus, savePerson, removePerson } = useStore();
  const existing = data.people.find((p) => p.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [relation, setRelation] = useState<Person['relation']>(existing?.relation ?? (data.people.some((p) => p.relation === 'me') ? 'spouse' : 'me'));
  const [status, setStatus] = useState<Status | null>(existing?.status ?? null);
  const [dates, setDates] = useState<Person['dates']>(existing?.dates ?? {});
  const [ds, setDs] = useState(!!existing?.ds);
  const [married, setMarried] = useState(!!existing?.marriedToCitizen);
  const [category, setCategory] = useState(existing?.category ?? '');
  const [charge, setCharge] = useState(existing?.chargeability ?? '');
  // Free covers one person; the rest of the household comes with Plus.
  if (!existing && data.people.length >= 1 && !plus) return <Redirect href="/plan" />;
  const queue = !!status && ASK[status].some((a) => a.key === 'priorityDate');

  function save() {
    savePerson({
      ...(existing ?? { jobs: [], trips: [] }), id: existing?.id ?? newId(), name: name.trim(), relation, status: status!, dates,
      ds: ds || undefined, marriedToCitizen: married || undefined, category: queue ? category.trim() || undefined : undefined,
      chargeability: queue ? charge || undefined : undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }
  function remove() {
    Alert.alert(`Remove ${existing!.name}?`, 'Their dates, trips, documents and cases come off this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { removePerson(existing!.id); router.back(); } },
    ]);
  }

  return (
    <Sheet title={existing ? existing.name : 'Add someone'} footer={<Button title="Save" kind="accent" disabled={!name.trim() || !status} onPress={save} />}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="First name" autoFocus={!existing} />
      <View style={{ gap: 8 }}>
        <T v="label">Who they are</T>
        <Row style={{ flexWrap: 'wrap' }}>{RELATIONS.map(([k, l]) => <Chip key={k} label={l} on={relation === k} onPress={() => setRelation(k)} />)}</Row>
      </View>
      <View style={{ gap: 10 }}>
        <T v="label">Status today</T>
        <StatusPicker value={status} onChange={(s) => setStatus(s)} />
      </View>
      {status && <DatesForm status={status} dates={dates} setDates={setDates} ds={ds} setDs={setDs} married={married} setMarried={setMarried} />}
      {queue && (
        <View style={{ gap: 10 }}>
          <Field label="Green card category" value={category} onChangeText={setCategory} placeholder="EB-2, EB-3, F2A…" autoCapitalize="characters" maxLength={12} />
          <T v="label">Chargeability (country of birth)</T>
          <Row style={{ flexWrap: 'wrap' }}>{CHARGE.map((x) => <Chip key={x} label={x} on={charge === x} onPress={() => setCharge(charge === x ? '' : x)} />)}</Row>
        </View>
      )}
      {existing && status && WORKING.includes(status) && (
        <View style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="label">Jobs</T>
            <Tap onPress={() => router.push({ pathname: '/job', params: { person: existing.id, mode: 'start' } })}><T v="small" color={c.accent}>Add a job</T></Tap>
          </Row>
          {!existing.jobs.length && <T v="small" muted>No jobs yet. They drive the unemployment and grace-period clocks.</T>}
          {existing.jobs.map((j) => (
            <Tap key={j.id} onPress={() => router.push({ pathname: '/job', params: { person: existing.id, id: j.id } })}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                <Icon ios="briefcase.fill" android="work" size={16} color={j.end ? c.muted : c.accent} />
                <View style={{ flex: 1 }}>
                  <T v="strong">{j.employer}</T>
                  <T v="small" muted>{full(j.start)} → {j.end ? full(j.end) : 'now'}</T>
                </View>
              </Card>
            </Tap>
          ))}
        </View>
      )}
      {existing && (data.people.length > 1 || existing.relation !== 'me') && (
        <Tap onPress={remove} style={{ alignSelf: 'center', paddingVertical: 8 }}><T v="small" color={c.danger}>Remove {existing.name}</T></Tap>
      )}
    </Sheet>
  );
}
