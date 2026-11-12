import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { DateField } from '@/components/date-field';
import { Sheet } from '@/components/sheet';
import { Button, Chip, Field, Row, T, Tap, toast } from '@/components/ui';
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
    if (!perm.granted) return toast(camera ? 'Camera access is off for Manendi in Settings.' : 'Photo access is off for Manendi in Settings.');
    try {
      const r = await (camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync)({ mediaTypes: ['images'], quality: 0.85 });
      if (r.canceled) return;
      const dir = new Directory(Paths.document, 'vault');
      dir.create({ idempotent: true, intermediates: true });
      const name = `${newId()}.jpg`;
      await new File(r.assets[0].uri).copy(new File(dir, name));
      setFiles((f) => [...f, name]);
    } catch {
      toast(camera ? 'No camera available here.' : 'Couldn’t add that photo.');
    }
  }
  function save() {
    const next = { id: doc?.id ?? newId(), personId, kind, title: title.trim() || DOC_KINDS.find((k) => k[0] === kind)![1], expires, files, addedAt: doc?.addedAt ?? new Date().toISOString() };
    for (const f of doc?.files ?? []) if (!files.includes(f)) { try { vaultFile(f).delete(); } catch {} }
    update((d) => ({ ...d, docs: doc ? d.docs.map((x) => (x.id === doc.id ? next : x)) : [...d.docs, next] }));
    router.back();
  }
  function remove() {
    Alert.alert('Delete this document?', 'The photos are removed from this phone.', [{ text: 'Cancel', style: 'cancel' }, {
      text: 'Delete', style: 'destructive', onPress: () => {
        for (const f of doc!.files) { try { vaultFile(f).delete(); } catch {} }
        update((d) => ({ ...d, docs: d.docs.filter((x) => x.id !== doc!.id) }));
        router.back();
      },
    }]);
  }

  return (
    <Sheet title={doc ? doc.title : 'Add a document'} footer={<Button title="Save" kind="accent" disabled={!personId} onPress={save} />}>
      <View style={{ gap: 8 }}>
        <T v="label">What it is</T>
        <Row style={{ flexWrap: 'wrap' }}>{DOC_KINDS.map(([k, l]) => <Chip key={k} label={l} on={kind === k} onPress={() => setKind(k)} />)}</Row>
      </View>
      <Field label="Name (optional)" value={title} onChangeText={setTitle} placeholder={`e.g. ${data.people.find((p) => p.id === personId)?.name ?? 'Ada'}’s passport`} />
      {data.people.length > 1 && (
        <View style={{ gap: 8 }}>
          <T v="label">Whose</T>
          <Row style={{ flexWrap: 'wrap' }}>{data.people.map((p) => <Chip key={p.id} label={p.name} on={personId === p.id} onPress={() => setPersonId(p.id)} />)}</Row>
        </View>
      )}
      <DateField label="Expires (optional)" value={expires} onChange={setExpires} />
      <View style={{ gap: 10 }}>
        <T v="label">Photos</T>
        {files.map((f) => (
          <View key={f}>
            <Image source={{ uri: vaultFile(f).uri }} style={{ height: 220, borderRadius: 18 }} contentFit="cover" accessibilityLabel="Document photo" />
            <Tap onPress={() => setFiles((x) => x.filter((y) => y !== f))} style={{ position: 'absolute', top: 10, right: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)' }}>
              <T v="small" color="#FFFFFF">Remove</T>
            </Tap>
          </View>
        ))}
        <Row style={{ gap: 10 }}>
          <Button title="Take photo" kind="soft" style={{ flex: 1, height: 48 }} onPress={() => add(true)} />
          <Button title="Choose photo" kind="soft" style={{ flex: 1, height: 48 }} onPress={() => add(false)} />
        </Row>
      </View>
      {doc && <Tap onPress={remove} style={{ alignSelf: 'center', paddingVertical: 8 }}><T v="small" color={c.danger}>Delete this document</T></Tap>}
    </Sheet>
  );
}
