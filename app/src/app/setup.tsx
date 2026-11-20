import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateField } from '@/components/date-field';
import { DatesForm, StatusPicker, WORKING } from '@/components/person-form';
import { Button, Field, Icon, Row, T, Tap } from '@/components/ui';
import { t } from '@/lib/i18n';
import type { Person, Status } from '@/lib/rules';
import { newId, useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function Setup() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { data, savePerson } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [dates, setDates] = useState<Person['dates']>({});
  const [ds, setDs] = useState(false);
  const [married, setMarried] = useState(false);
  const [employer, setEmployer] = useState('');
  const [jobStart, setJobStart] = useState<string>();
  const working = !!status && WORKING.includes(status);

  function finish() {
    savePerson({
      id: newId(), name: name.trim(), relation: 'me', status: status!, dates, ds: ds || undefined, marriedToCitizen: married || undefined, trips: [],
      jobs: working && jobStart ? [{ id: newId(), employer: employer.trim() || t('setup.currentJob'), start: jobStart }] : [],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismissAll();
    router.replace('/(tabs)');
    // Value first, then the ask: the new clock shows for a beat before the backup offer. Already signed in (a restore
    // that found no backup) means it's backing up, so no offer.
    if (!data.account) setTimeout(() => router.push('/backup'), 900);
  }

  const steps = [
    { title: t('setup.name.title'), sub: t('setup.name.sub'), ok: !!name.trim() },
    { title: t('setup.status.title'), sub: t('setup.status.sub'), ok: !!status },
    { title: t('setup.dates.title'), sub: t('setup.dates.sub'), ok: true },
  ];
  const now = steps[step];

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24, paddingHorizontal: 24, gap: 22 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Tap onPress={() => (step ? setStep(step - 1) : router.back())} accessibilityLabel={t('setup.back')}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon ios="chevron.left" android="arrow_back" size={18} />
          </Tap>
          <Row style={{ gap: 6 }}>
            {steps.map((_, i) => (
              <Animated.View key={i} style={{ width: i === step ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: i <= step ? c.accent : c.line, transitionProperty: ['width', 'backgroundColor'], transitionDuration: 250 }} />
            ))}
          </Row>
        </Row>
        <Animated.View key={step} entering={FadeInRight.duration(280)} style={{ gap: 22 }}>
          <View style={{ gap: 8 }}>
            <T v="hero">{now.title}</T>
            <T muted>{now.sub}</T>
          </View>
          {step === 0 && (
            <Field label={t('setup.name.label')} value={name} onChangeText={setName} placeholder={t('setup.name.placeholder')} autoFocus autoComplete="given-name"
              textContentType="givenName" returnKeyType="next" onSubmitEditing={() => name.trim() && setStep(1)} />
          )}
          {step === 1 && <StatusPicker value={status} onChange={(s) => { setStatus(s); setDates({}); }} />}
          {step === 2 && status && (
            <>
              <DatesForm status={status} dates={dates} setDates={setDates} ds={ds} setDs={setDs} married={married} setMarried={setMarried} />
              {working && (
                <View style={{ gap: 14 }}>
                  <T v="h2">{t('setup.job.title')}</T>
                  <Field label={t('setup.job.employer')} value={employer} onChangeText={setEmployer} placeholder={t('setup.job.optional')} />
                  <DateField label={t('setup.job.start')} value={jobStart} onChange={setJobStart} hint={t('setup.job.startHint')} />
                </View>
              )}
              <T v="small" muted>{t('setup.disclaimer')}</T>
            </>
          )}
        </Animated.View>
      </ScrollView>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: c.bg }} />
      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 14, gap: 10 }}>
        <Button title={t(step < 2 ? 'setup.next' : 'setup.finish')} kind="accent" disabled={!now.ok} onPress={() => (step < 2 ? setStep(step + 1) : finish())} />
      </View>
    </KeyboardAvoidingView>
  );
}
