import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { DateField } from '@/components/date-field';
import { Sheet } from '@/components/sheet';
import { Button, Chip, Field, T, Tap } from '@/components/ui';
import { daysAbroad } from '@/lib/rules';
import { today } from '@/lib/dates';
import { newId, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function TripScreen() {
  const c = useColors();
  const { person, id } = useLocalSearchParams<{ person?: string; id?: string }>();
  const { data, me, savePerson } = useStore();
  const p = data.people.find((x) => x.id === person) ?? me;
  const trip = p?.trips.find((t) => t.id === id);
  const [place, setPlace] = useState(trip?.place ?? '');
  const [depart, setDepart] = useState(trip?.depart);
  const [back, setBack] = useState(trip?.return ?? undefined);
  const [away, setAway] = useState(!!trip && !trip.return);
  if (!p) return null;
  const valid = !!depart && (away || (!!back && back >= depart));
  const days = depart ? daysAbroad({ id: '', depart, return: away ? null : back }, depart, away ? today() : back ?? depart) : 0;

  function save() {
    const t = { id: trip?.id ?? newId(), depart: depart!, return: away ? null : back!, place: place.trim() || undefined };
    savePerson({ ...p!, trips: trip ? p!.trips.map((x) => (x.id === trip.id ? t : x)) : [...p!.trips, t] });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  return (
    <Sheet title={trip ? 'Trip' : 'Add a trip'} footer={<Button title="Save" kind="accent" disabled={!valid} onPress={save} />}>
      <Field label="Where" value={place} onChangeText={setPlace} placeholder="Country or city (optional)" autoFocus={!trip} />
      <DateField label="Left the US" value={depart} onChange={setDepart} />
      <Chip label="I’m still away" on={away} onPress={() => setAway(!away)} />
      {!away && <DateField label="Came back" value={back} onChange={setBack} />}
      {valid && <T muted>{days} full day{days === 1 ? '' : 's'} abroad. Departure and return days count as days in the US.</T>}
      {trip && (
        <Tap onPress={() => { savePerson({ ...p, trips: p.trips.filter((x) => x.id !== trip.id) }); router.back(); }} style={{ alignSelf: 'center', paddingVertical: 8 }}>
          <T v="small" color={c.danger}>Delete this trip</T>
        </Tap>
      )}
    </Sheet>
  );
}
