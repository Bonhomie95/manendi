import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { DateField } from '@/components/date-field';
import { Sheet } from '@/components/sheet';
import { Button, Chip, Field, Row, T, Tap, toast } from '@/components/ui';
import { t, type Key } from '@/lib/i18n';
import { DOC_KINDS } from '@/lib/meta';
import { newId, useStore, vaultFile, type DocKind } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function DocScreen() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, me, update, plus } = useStore();
  const doc = data.docs.find((d) => d.id === id);
  const [kind, setKind] = useState<DocKind>(doc?.kind ?? 'passport');
  const [title, setTitle] = useState(doc?.title ?? '');
  const [personId, setPersonId] = useState(doc?.personId ?? me?.id ?? '');
  const [expires, setExpires] = useState(doc?.expires);
  const [files, setFiles] = useState<string[]>(doc?.files ?? []);
  if (!plus) return null;

  async function add(camera: boolean) {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return toast(camera ? t('doc.cameraOff') : t('doc.photosOff'));
    try {
      const r = await (camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({ mediaTypes: ['images'], quality: 0.85 });
      if (r.canceled) return;
      const dir = new Directory(Paths.document, 'vault');
      dir.create({ idempotent: true, intermediates: true });
      const name = `${newId()}.jpg`;
      await new File(r.assets[0].uri).copy(new File(dir, name));
      setFiles((f) => [...f, name]);
    } catch {
      toast(camera ? t('doc.noCamera') : t('doc.photoFailed'));
    }
  }
  function save() {
    const next = { id: doc?.id ?? newId(), personId, kind, title: title.trim() || t(`doc.kind.${kind}` as Key), expires, files, addedAt: doc?.addedAt ?? new Date().toISOString() };
    for (const f of doc?.files ?? []) if (!files.includes(f)) { try { vaultFile(f).delete(); } catch {} }
    update((d) => ({ ...d, docs: doc ? d.docs.map((x) => (x.id === doc.id ? next : x)) : [...d.docs, next] }));
    router.back();
  }
  function remove() {
    Alert.alert(t('doc.delete.title'), t('doc.delete.body'), [{ text: t('doc.cancel'), style: 'cancel' }, {
      text: t('doc.delete'), style: 'destructive', onPress: () => {
        for (const f of doc!.files) { try { vaultFile(f).delete(); } catch {} }
        update((d) => ({ ...d, docs: d.docs.filter((x) => x.id !== doc!.id) }));
        router.back();
      },
    }]);
  }

  return (
    <Sheet title={doc ? doc.title : t('doc.add')} footer={<Button title={t('doc.save')} kind="accent" disabled={!personId} onPress={save} />}>
      <View style={{ gap: 8 }}>
        <T v="label">{t('doc.what')}</T>
        <Row style={{ flexWrap: 'wrap' }}>{DOC_KINDS.map(([k]) => <Chip key={k} label={t(`doc.kind.${k}` as Key)} on={kind === k} onPress={() => setKind(k)} />)}</Row>
      </View>
      <Field label={t('doc.name')} value={title} onChangeText={setTitle} placeholder={t('doc.name.placeholder', { name: data.people.find((p) => p.id === personId)?.name ?? 'Ada' })} />
      {data.people.length > 1 && (
        <View style={{ gap: 8 }}>
          <T v="label">{t('doc.whose')}</T>
          <Row style={{ flexWrap: 'wrap' }}>{data.people.map((p) => <Chip key={p.id} label={p.name} on={personId === p.id} onPress={() => setPersonId(p.id)} />)}</Row>
        </View>
      )}
      <DateField label={t('doc.expires')} value={expires} onChange={setExpires} />
      <View style={{ gap: 10 }}>
        <T v="label">{t('doc.photos')}</T>
        {files.map((f) => (
          <View key={f}>
            <Image source={{ uri: vaultFile(f).uri }} style={{ height: 220, borderRadius: 18 }} contentFit="cover" accessibilityLabel={t('doc.photoLabel')} />
            <Tap onPress={() => setFiles((x) => x.filter((y) => y !== f))} style={{ position: 'absolute', top: 10, right: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)' }}>
              <T v="small" color="#FFFFFF">{t('doc.removePhoto')}</T>
            </Tap>
          </View>
        ))}
        <Row style={{ gap: 10 }}>
          <Button title={t('doc.takePhoto')} kind="soft" style={{ flex: 1, height: 48 }} onPress={() => add(true)} />
          <Button title={t('doc.choosePhoto')} kind="soft" style={{ flex: 1, height: 48 }} onPress={() => add(false)} />
        </Row>
      </View>
      {doc && <Tap onPress={remove} style={{ alignSelf: 'center', paddingVertical: 8 }}><T v="small" color={c.danger}>{t('doc.deleteLink')}</T></Tap>}
    </Sheet>
  );
}
