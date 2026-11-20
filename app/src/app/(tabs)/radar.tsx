import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Appear, Button, Card, Chip, Icon, Row, Screen, T, Tap } from '@/components/ui';
import { api, openLink, type RadarItem } from '@/lib/api';
import { full, today } from '@/lib/dates';
import { t, tr } from '@/lib/i18n';
import { useLoad } from '@/lib/load';
import { SOURCES, TAGS, daysBetween, span } from '@/lib/rules';
import { useStore } from '@/lib/store';
import { tint, useColors } from '@/lib/theme';

const KIND: Record<string, string> = { Rule: t('radar.kind.rule'), 'Proposed Rule': t('radar.kind.proposedRule'), 'Presidential Document': t('radar.kind.presidential'), Notice: t('radar.kind.notice') };
// The server's policy tags (server/radar.mjs) are data. Official names among them (H-1B, OPT…) show as they are.
const TAG: Record<string, string> = {
  students: t('radar.tag.students'), 'work permits': t('radar.tag.workPermits'), 'work visas': t('radar.tag.workVisas'),
  'green cards': t('radar.tag.greenCards'), citizenship: t('radar.tag.citizenship'), 'travel & entry': t('radar.tag.travelEntry'),
  fees: t('radar.tag.fees'), humanitarian: t('radar.tag.humanitarian'), 'exchange visitors': t('radar.tag.exchangeVisitors'),
  visitors: t('radar.tag.visitors'), 'courts & enforcement': t('radar.tag.courtsEnforcement'),
};

export default function Radar() {
  const c = useColors();
  const { data } = useStore();
  const { data: feed, error, loading, reload } = useLoad(() => api<{ items: RadarItem[]; at: number }>('/radar'));
  const [everything, setEverything] = useState(false);
  const mine = new Set(data.people.flatMap((p) => TAGS[p.status]));
  const items = (feed?.items ?? []).filter((i) => everything || i.tags.some((tag) => mine.has(tag)));
  const queue = data.people.filter((p) => p.dates.priorityDate);
  const tone = (type: string) => ({ Rule: c.accent, 'Proposed Rule': c.gold, 'Presidential Document': c.alt })[type] ?? c.muted;

  return (
    <Screen onRefresh={reload}>
      <View style={{ marginTop: 4, gap: 4 }}>
        <T v="title">{t('tabs.radar')}</T>
        <T v="small" muted>{t('radar.intro')}</T>
      </View>
      <Row>
        <Chip label={t('radar.forYou')} on={!everything} onPress={() => setEverything(false)} />
        <Chip label={t('radar.everything')} on={everything} onPress={() => setEverything(true)} />
      </Row>

      {queue.map((p) => (
        <Appear key={p.id}><Card style={{ gap: 8, backgroundColor: tint(c.accent, 0.08), borderColor: tint(c.accent, 0.3) }}>
          <Row><Icon ios="person.badge.clock.fill" android="pending_actions" size={18} color={c.accent} /><T v="label" color={c.accent}>{t('radar.queue.title', { name: p.name })}</T></Row>
          <T v="strong">{[p.category, p.chargeability].filter(Boolean).join(' · ') || t('radar.queue.priorityDate')} · {full(p.dates.priorityDate!)}</T>
          <T v="small" muted>{t('radar.queue.waiting', { wait: span(daysBetween(p.dates.priorityDate!, today()), tr) })}</T>
          <Button title={t('radar.queue.open')} kind="soft" style={{ height: 44 }} onPress={() => openLink(SOURCES.bulletin)} />
        </Card></Appear>
      ))}

      {!feed && loading && <ActivityIndicator style={{ marginTop: 30 }} color={c.muted} />}
      {error && !feed && (
        <Card style={{ alignItems: 'center', gap: 10 }}>
          <T muted style={{ textAlign: 'center' }}>{error}</T>
          <Button title={t('radar.retry')} kind="soft" onPress={reload} style={{ alignSelf: 'stretch' }} />
        </Card>
      )}
      {feed && !items.length && <T muted style={{ textAlign: 'center', marginTop: 20 }}>{t('radar.empty')}</T>}

      {items.map((i, n) => {
        const closes = i.commentsClose && i.commentsClose >= today() ? i.commentsClose : null;
        return (
          <Appear key={i.id} i={n + 1}>
            <Tap onPress={() => openLink(i.url)} accessibilityLabel={t('radar.item.a11y', { kind: KIND[i.type] ?? i.type, title: i.title })}>
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
                  {i.tags.map((tag) => (
                    <View key={tag} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: mine.has(tag) ? tint(c.accent, 0.14) : c.soft }}>
                      <T v="small" style={{ fontSize: 11 }} color={mine.has(tag) ? c.accent : c.muted}>{TAG[tag] ?? tag}</T>
                    </View>
                  ))}
                </Row>
                {(closes || i.effective) && (
                  <T v="small" color={closes ? c.warn : c.muted}>{closes ? t('radar.commentsClose', { date: full(closes) }) : t('radar.effective', { date: full(i.effective!) })}</T>
                )}
              </Card>
            </Tap>
          </Appear>
        );
      })}
      {feed && <T v="small" muted style={{ textAlign: 'center' }}>{t('radar.source')}</T>}
    </Screen>
  );
}
