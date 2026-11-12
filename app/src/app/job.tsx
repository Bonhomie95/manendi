import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { DateField } from '@/components/date-field';
import { Sheet } from '@/components/sheet';
import { Button, Field, T, Tap, toast } from '@/components/ui';
import { newId, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function JobScreen() {
  const c = useColors();
  const { person, id, mode } = useLocalSearchParams<{ person?: string; id?: string; mode?: 'end' | 'start' }>();
  const { data, me, savePerson } = useStore();
  const p = data.people.find((x) => x.id === person) ?? me;
  const current = id ? p?.jobs.find((j) => j.id === id) : mode === 'end' ? p?.jobs.find((j) => !j.end) : undefined;
  const ending = mode === 'end';
  const [employer, setEmployer] = useState(current?.employer ?? '');
  const [start, setStart] = useState(current?.start);
  const [end, setEnd] = useState(current?.end ?? undefined);
  if (!p) return null;
  const valid = !!start && (!end || end >= start) && (!ending || !!end);

  function save() {
    const job = { id: current?.id ?? newId(), employer: employer.trim() || 'Job', start: start!, end: end ?? null };
    savePerson({ ...p!, jobs: current ? p!.jobs.map((j) => (j.id === current.id ? job : j)) : [...p!.jobs, job] });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const opt = p!.status === 'OPT' || p!.status === 'STEM OPT';
    toast(end && ending ? (opt ? 'Saved. Unemployment days count again from the day after.' : 'Saved. Your grace-period clock is on Status.') : 'Saved.');
    router.back();
  }

  return (
    <Sheet title={ending ? 'My job ended' : current ? 'Job' : 'New job'} footer={<Button title="Save" kind="accent" disabled={!valid} onPress={save} />}>
      {ending && <T muted>Losing a job starts a clock: a 60-day grace period on work visas, unemployment days on OPT. Manendi shows it the moment you save.</T>}
      <Field label="Employer" value={employer} onChangeText={setEmployer} placeholder="Company name" autoFocus={!current} />
      <DateField label="First day" value={start} onChange={setStart} />
      <DateField label={ending ? 'Last day (or the day it will end)' : 'Last day (leave empty if you still work there)'} value={end} onChange={setEnd} />
      {current && !ending && (
        <Tap onPress={() => { savePerson({ ...p, jobs: p.jobs.filter((j) => j.id !== current.id) }); router.back(); }} style={{ alignSelf: 'center', paddingVertical: 8 }}>
          <T v="small" color={c.danger}>Delete this job</T>
        </Tap>
      )}
    </Sheet>
  );
}
