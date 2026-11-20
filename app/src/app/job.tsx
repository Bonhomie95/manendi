import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { DateField } from '@/components/date-field';
import { Sheet } from '@/components/sheet';
import { Button, Field, T, Tap, toast } from '@/components/ui';
import { t } from '@/lib/i18n';
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
    const job = { id: current?.id ?? newId(), employer: employer.trim() || t('job.defaultName'), start: start!, end: end ?? null };
    savePerson({ ...p!, jobs: current ? p!.jobs.map((j) => (j.id === current.id ? job : j)) : [...p!.jobs, job] });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const opt = p!.status === 'OPT' || p!.status === 'STEM OPT';
    toast(end && ending ? (opt ? t('job.saved.opt') : t('job.saved.grace')) : t('job.saved'));
    router.back();
  }

  return (
    <Sheet title={ending ? t('job.ended') : current ? t('job.title') : t('job.new')} footer={<Button title={t('job.save')} kind="accent" disabled={!valid} onPress={save} />}>
      {ending && <T muted>{t('job.ending.help')}</T>}
      <Field label={t('job.employer')} value={employer} onChangeText={setEmployer} placeholder={t('job.employer.placeholder')} autoFocus={!current} />
      <DateField label={t('job.start')} value={start} onChange={setStart} />
      <DateField label={ending ? t('job.end.ending') : t('job.end')} value={end} onChange={setEnd} />
      {current && !ending && (
        <Tap onPress={() => { savePerson({ ...p, jobs: p.jobs.filter((j) => j.id !== current.id) }); router.back(); }} style={{ alignSelf: 'center', paddingVertical: 8 }}>
          <T v="small" color={c.danger}>{t('job.delete')}</T>
        </Tap>
      )}
    </Sheet>
  );
}
