import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Appear, Button, Card, Chip, Icon, Row, Screen, T, Tap } from '@/components/ui';
import { api, openLink, type RadarItem } from '@/lib/api';
import { full, today } from '@/lib/dates';
import { useLoad } from '@/lib/load';
import { SOURCES, TAGS, daysBetween, span } from '@/lib/rules';
import { useStore } from '@/lib/store';
import { tint, useColors } from '@/lib/theme';

const KIND: Record<string, string> = { Rule: 'Final rule', 'Proposed Rule': 'Proposed rule', 'Presidential Document': 'Presidential', Notice: 'Notice' };

export default function Radar() {
  const c = useColors();
  const { data } = useStore();
  const { data: feed, error, loading, reload } = useLoad(() => api<{ items: RadarItem[]; at: number }>('/radar'));
  const [everything, setEverything] = useState(false);
  const mine = new Set(data.people.flatMap((p) => TAGS[p.status]));
  const items = (feed?.items ?? []).filter((i) => everything || i.tags.some((t) => mine.has(t)));
  const queue = data.people.filter((p) => p.dates.priorityDate);
  const tone = (t: string) => ({ Rule: c.accent, 'Proposed Rule': c.gold, 'Presidential Document': c.alt })[t] ?? c.muted;

  return (
    <Screen onRefresh={reload}>
      <View style={{ marginTop: 4, gap: 4 }}>
        <T v="title">Radar</T>
        <T v="small" muted>Rules, fees and notices that touch your visa, straight from the Federal Register.</T>
      </View>
      <Row>
        <Chip label="For you" on={!everything} onPress={() => setEverything(false)} />
        <Chip label="Everything" on={everything} onPress={() => setEverything(true)} />
      </Row>

      {queue.map((p) => (
        <Appear key={p.id}><Card style={{ gap: 8, backgroundColor: tint(c.accent, 0.08), borderColor: tint(c.accent, 0.3) }}>
          <Row><Icon ios="person.badge.clock.fill" android="pending_actions" size={18} color={c.accent} /><T v="label" color={c.accent}>{p.name}’s green card queue</T></Row>
          <T v="strong">{[p.category, p.chargeability].filter(Boolean).join(' · ') || 'Priority date'} · {full(p.dates.priorityDate!)}</T>
          <T v="small" muted>Waiting {span(daysBetween(p.dates.priorityDate!, today()))}. Compare with the Final Action Dates in this month’s bulletin.</T>
          <Button title="Open the Visa Bulletin" kind="soft" style={{ height: 44 }} onPress={() => openLink(SOURCES.bulletin)} />
        </Card></Appear>
      ))}

      {!feed && loading && <ActivityIndicator style={{ marginTop: 30 }} color={c.muted} />}
      {error && !feed && (
        <Card style={{ alignItems: 'center', gap: 10 }}>
          <T muted style={{ textAlign: 'center' }}>{error}</T>
          <Button title="Try again" kind="soft" onPress={reload} style={{ alignSelf: 'stretch' }} />
        </Card>
      )}
      {feed && !items.length && <T muted style={{ textAlign: 'center', marginTop: 20 }}>Nothing new for your visas. Tap Everything to see the rest.</T>}

      {items.map((i, n) => {
        const closes = i.commentsClose && i.commentsClose >= today() ? i.commentsClose : null;
        return (
          <Appear key={i.id} i={n + 1}>
            <Tap onPress={() => openLink(i.url)} accessibilityLabel={`${KIND[i.type] ?? i.type}: ${i.title}`}>
              <Card style={{ gap: 8 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9, backgroundColor: tint(tone(i.type), 0.14) }}>
                    <T v="label" color={tone(i.type)} style={{ fontSize: 10.5 }}>{KIND[i.type] ?? i.type}</T>
                  </View>
                  <T v="small" muted>{full(i.date)}</T>
                </Row>
                <T v="h2" style={{ fontSize: 21, lineHeight: 25 }} numberOfLines={3}>{i.title}</T>
                {!!i.abstract && <T v="small" muted numberOfLines={3}>{i.abstract}</T>}
                <Row style={{ flexWrap: 'wrap', gap: 6 }}>
                  {i.tags.map((t) => (
                    <View key={t} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: mine.has(t) ? tint(c.accent, 0.14) : c.soft }}>
                      <T v="small" style={{ fontSize: 11 }} color={mine.has(t) ? c.accent : c.muted}>{t}</T>
                    </View>
                  ))}
                </Row>
                {(closes || i.effective) && (
                  <T v="small" color={closes ? c.warn : c.muted}>{closes ? `Public comments close ${full(closes)}` : `Effective ${full(i.effective!)}`}</T>
                )}
              </Card>
            </Tap>
          </Appear>
        );
      })}
      {feed && <T v="small" muted style={{ textAlign: 'center' }}>Source: federalregister.gov. Summaries are the agencies’ own words.</T>}
    </Screen>
  );
}
