import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Sheet } from '@/components/sheet';
import { Appear, Button, Card, Icon, Row, T, Tap } from '@/components/ui';
import { full, today } from '@/lib/dates';
import { packing } from '@/lib/meta';
import { clocks } from '@/lib/rules';
import { useStore } from '@/lib/store';
import { levelColor, tint, useColors } from '@/lib/theme';

const WATCH = ['passport', 'visa', 'i94', 'ead', 'ap', 'i90', 'i751', 'unemployment', 'grace', 'opt-end', 'f1-grace', 'j1-grace', 'ds-cap'];

export default function Fly() {
  const c = useColors();
  const { person } = useLocalSearchParams<{ person?: string }>();
  const { data, me } = useStore();
  const p = data.people.find((x) => x.id === person) ?? me;
  const [done, setDone] = useState<Set<number>>(new Set());
  if (!p) return null;
  const warnings = clocks(p, today()).filter((x) => WATCH.includes(x.id) && x.level !== 'ok' && !(x.id === 'visa' && (x.days ?? 0) >= 0));
  const list = packing(p.status);

  return (
    <Sheet title="Before you fly" footer={<Button title="Log this trip" kind="accent" onPress={() => router.replace({ pathname: '/trip', params: { person: p.id } })} />}>
      <T muted>For {p.name} · {p.status}. What people in this status usually carry. Check your own documents and ask your DSO or HR if anything changed.</T>
      {warnings.map((w, i) => (
        <Appear key={w.id} i={i}><Card style={{ gap: 4, backgroundColor: tint(levelColor(c, w.level), 0.08), borderColor: tint(levelColor(c, w.level), 0.3) }}>
          <Row><Icon ios="exclamationmark.triangle.fill" android="warning" size={16} color={levelColor(c, w.level)} /><T v="strong">{w.title}{w.date ? ` · ${full(w.date)}` : ''}</T></Row>
          <T v="small" muted>{w.note}</T>
        </Card></Appear>
      ))}
      <View style={{ gap: 4 }}>
        {list.map((item, i) => {
          const on = done.has(i);
          return (
            <Tap key={item} onPress={() => setDone((s) => { const n = new Set(s); if (on) n.delete(i); else n.add(i); return n; })}
              accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={item}>
              <Row style={{ gap: 12, paddingVertical: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: on ? c.accent : c.line, backgroundColor: on ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <Animated.View entering={ZoomIn.springify().damping(12)}><Icon ios="checkmark" android="check" size={13} color={c.onAccent} /></Animated.View>}
                </View>
                <T style={{ flex: 1, textDecorationLine: on ? 'line-through' : 'none' }} muted={on}>{item}</T>
              </Row>
            </Tap>
          );
        })}
      </View>
      <T v="small" muted>Information, not legal advice. Entry is always up to the officer at the border.</T>
    </Sheet>
  );
}
