import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { DateField } from '@/components/date-field';
import { Sheet } from '@/components/sheet';
import { Button, Chip, Field, T, Tap } from '@/components/ui';
import { daysAbroad } from '@/lib/rules';
import { today } from '@/lib/dates';
import { t } from '@/lib/i18n';
import { newId, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function TripScreen() {
  const c = useColors();
  const { person, id } = useLocalSearchParams<{ person?: string; id?: string }>();
  const { data, me, savePerson } = useStore();
  const p = data.people.find((x) => x.id === person) ?? me;
  const trip = p?.trips.find((x) => x.id === id);
  const [place, setPlace] = useState(trip?.place ?? '');
  const [depart, setDepart] = useState(trip?.depart);
  const [back, setBack] = useState(trip?.return ?? undefined);
  const [away, setAway] = useState(!!trip && !trip.return);
  if (!p) return null;
  const valid = !!depart && (away || (!!back && back >= depart));
  const days = depart ? daysAbroad({ id: '', depart, return: away ? null : back }, depart, away ? today() : back ?? depart) : 0;

  function save() {
    const next = { id: trip?.id ?? newId(), depart: depart!, return: away ? null : back!, place: place.trim() || undefined };
    savePerson({ ...p!, trips: trip ? p!.trips.map((x) => (x.id === trip.id ? next : x)) : [...p!.trips, next] });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  return (
    <Sheet title={trip ? t('trip.title') : t('trip.add')} footer={<Button title={t('trip.save')} kind="accent" disabled={!valid} onPress={save} />}>
      <Field label={t('trip.where')} value={place} onChangeText={setPlace} placeholder={t('trip.where.placeholder')} autoFocus={!trip} />
      <DateField label={t('trip.left')} value={depart} onChange={setDepart} />
      <Chip label={t('trip.away')} on={away} onPress={() => setAway(!away)} />
      {!away && <DateField label={t('trip.back')} value={back} onChange={setBack} />}
      {valid && <T muted>{t('trip.days', { n: days })}</T>}
      {trip && (
        <Tap onPress={() => { savePerson({ ...p, trips: p.trips.filter((x) => x.id !== trip.id) }); router.back(); }} style={{ alignSelf: 'center', paddingVertical: 8 }}>
          <T v="small" color={c.danger}>{t('trip.delete')}</T>
        </Tap>
      )}
    </Sheet>
  );
}
