import { Image } from 'expo-image';
import * as LocalAuthentication from 'expo-local-authentication';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Icon, Row, Screen, T, Tap } from '@/components/ui';
import { full } from '@/lib/dates';
import { DOC_KINDS } from '@/lib/meta';
import { useStore, vaultFile } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function Vault() {
  const c = useColors();
  const { data, plus } = useStore();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  async function unlock() {
    // No passcode or biometrics on the device means there is nothing to check against.
    if ((await LocalAuthentication.getEnrolledLevelAsync()) === LocalAuthentication.SecurityLevel.NONE) return setOpen(true);
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock your document vault', cancelLabel: 'Not now' });
    setOpen(r.success);
    setFailed(!r.success);
  }
  useEffect(() => { if (plus) void unlock(); }, [plus]); // eslint-disable-line react-hooks/set-state-in-effect -- state changes after the prompt answers
  if (!plus) return <Redirect href="/plan" />;

  return (
    <Screen style={{ paddingTop: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Tap onPress={() => router.back()} accessibilityLabel="Back" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon ios="chevron.left" android="arrow_back" size={18} />
        </Tap>
        {open && (
          <Tap onPress={() => router.push('/doc')} accessibilityLabel="Add a document" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.text, alignItems: 'center', justifyContent: 'center' }}>
            <Icon ios="plus" android="add" size={18} color={c.bg} />
          </Tap>
        )}
      </Row>
      <T v="title">Document vault</T>
      <Row style={{ gap: 6 }}><Icon ios="lock.fill" android="lock" size={12} color={c.muted} /><T v="small" muted>Stored only on this phone, behind Face ID or your passcode.</T></Row>

      {!open ? (
        <Card style={{ alignItems: 'center', gap: 12, paddingVertical: 34, marginTop: 10 }}>
          <Icon ios="faceid" android="fingerprint" size={40} color={c.accent} />
          <T v="h2">{failed ? 'Still locked' : 'Locked'}</T>
          <Button title="Unlock" kind="accent" onPress={unlock} style={{ alignSelf: 'stretch' }} />
        </Card>
      ) : !data.docs.length ? (
        <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 30, marginTop: 10 }}>
          <Icon ios="doc.viewfinder" android="document_scanner" size={36} color={c.accent} />
          <T v="h2">Nothing here yet</T>
          <T muted style={{ textAlign: 'center' }}>Snap your passport, I-797s, EAD or green card so they’re there at the airport, the DMV or HR.</T>
          <Button title="Add a document" kind="accent" onPress={() => router.push('/doc')} style={{ alignSelf: 'stretch' }} />
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {data.docs.map((d) => {
            const kind = DOC_KINDS.find((k) => k[0] === d.kind);
            const who = data.people.find((p) => p.id === d.personId)?.name;
            return (
              <Tap key={d.id} onPress={() => router.push({ pathname: '/doc', params: { id: d.id } })} accessibilityLabel={d.title} style={{ width: '47%' }}>
                <Card style={{ padding: 10, gap: 8 }}>
                  {d.files[0] ? <Image source={{ uri: vaultFile(d.files[0]).uri }} style={{ height: 110, borderRadius: 16 }} contentFit="cover" />
                    : <View style={{ height: 110, borderRadius: 16, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}><Icon ios={kind?.[2] ?? 'doc'} android={kind?.[3] ?? 'description'} size={28} color={c.muted} /></View>}
                  <T v="strong" numberOfLines={1}>{d.title}</T>
                  <T v="small" muted numberOfLines={1}>{[who, d.expires && `exp. ${full(d.expires)}`].filter(Boolean).join(' · ')}</T>
                </Card>
              </Tap>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
