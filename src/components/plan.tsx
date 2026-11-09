import { View } from 'react-native';

import { formatTime, timeToMinutes } from '@/lib/dates';
import { PLAN_SECTIONS, REMINDERS } from '@/lib/forms';
import { colors } from '@/lib/theme';
import type { PlanContent, PlanReminders, ScheduleItem } from '@/lib/types';

import { Card, Icon, IconBubble, Row, SectionTitle, Txt } from './ui';

/** Combina recordatorios + horario del plan en una línea de tiempo diaria. */
export function buildTimeline(content: PlanContent, reminders: PlanReminders): (ScheduleItem & { icon: string; color: string; reminder?: boolean })[] {
  const items: (ScheduleItem & { icon: string; color: string; reminder?: boolean })[] = [];
  for (const r of REMINDERS) {
    const cfg = reminders[r.key];
    if (cfg?.time) items.push({ time: cfg.time, label: r.label, icon: r.icon, color: r.color, reminder: cfg.enabled });
  }
  for (const s of content.schedule ?? []) {
    if (s.time && s.label) items.push({ ...s, icon: 'clock-outline', color: colors.primarySoft });
  }
  return items.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

export function Timeline({ content, reminders, highlightNow }: { content: PlanContent; reminders: PlanReminders; highlightNow?: boolean }) {
  const items = buildTimeline(content, reminders);
  if (!items.length) return null;
  const nowMin = timeToMinutes(formatTime(new Date()));
  const nextIdx = highlightNow ? items.findIndex((i) => timeToMinutes(i.time) >= nowMin) : -1;
  return (
    <View>
      {items.map((it, idx) => (
        <Row key={`${it.time}-${idx}`} style={{ alignItems: 'stretch' }} gap={12}>
          <View style={{ width: 52, paddingTop: 10 }}>
            <Txt variant="h3" color={idx === nextIdx ? colors.primaryDark : colors.night}>
              {it.time}
            </Txt>
          </View>
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 2, flex: 1, backgroundColor: idx === 0 ? 'transparent' : colors.border }} />
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: idx === nextIdx ? colors.primary : it.color, borderWidth: 2, borderColor: '#fff' }} />
            <View style={{ width: 2, flex: 1, backgroundColor: idx === items.length - 1 ? 'transparent' : colors.border }} />
          </View>
          <View style={{ flex: 1, paddingVertical: 6 }}>
            <View style={{ backgroundColor: it.color, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 }}>
              <Row gap={8}>
                <Icon name={it.icon} size={18} color={colors.night} />
                <Txt style={{ flex: 1 }}>{it.label}</Txt>
                {it.reminder ? <Icon name="bell-ring-outline" size={16} color={colors.night} /> : null}
              </Row>
              {idx === nextIdx ? (
                <Txt variant="caption" color={colors.primaryDark} style={{ marginTop: 2 }}>
                  Lo próximo de hoy
                </Txt>
              ) : null}
            </View>
          </View>
        </Row>
      ))}
    </View>
  );
}

export function PlanSections({ content }: { content: PlanContent }) {
  const sections = PLAN_SECTIONS.filter((s) => content[s.key]?.trim());
  return (
    <View>
      {sections.map((s) => (
        <View key={s.key}>
          <SectionTitle icon={s.icon}>{s.title}</SectionTitle>
          <Card>
            <FormattedText text={content[s.key] ?? ''} />
          </Card>
        </View>
      ))}
    </View>
  );
}

/** Texto con soporte básico de listas: líneas que empiezan por "-", "•" o "*". */
export function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 6 }}>
      {lines.map((l, i) => {
        const t = l.trim();
        if (!t) return <View key={i} style={{ height: 4 }} />;
        const bullet = /^[-•*]\s+/.test(t);
        const heading = /^#+\s+/.test(t) || (t === t.toUpperCase() && t.length > 3 && /[A-ZÁÉÍÓÚÑ]/.test(t) && t.length < 60);
        if (heading)
          return (
            <Txt key={i} variant="h3" color={colors.primaryDark} style={{ marginTop: 4 }}>
              {t.replace(/^#+\s+/, '')}
            </Txt>
          );
        if (bullet)
          return (
            <Row key={i} style={{ alignItems: 'flex-start' }} gap={8}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 8 }} />
              <Txt style={{ flex: 1 }}>{t.replace(/^[-•*]\s+/, '')}</Txt>
            </Row>
          );
        return <Txt key={i}>{t}</Txt>;
      })}
    </View>
  );
}

export function ReminderSummary({ reminders }: { reminders: PlanReminders }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {REMINDERS.map((r) => {
        const cfg = reminders[r.key];
        return (
          <View key={r.key} style={{ flexGrow: 1, flexBasis: 150, backgroundColor: r.color, borderRadius: 18, padding: 12 }}>
            <Row gap={8}>
              <IconBubble name={r.icon} size={34} bg="#ffffffaa" color={colors.night} />
              <View style={{ flex: 1 }}>
                <Txt variant="small" color={colors.night}>
                  {r.label}
                </Txt>
                <Txt variant="h3" color={colors.night}>
                  {cfg?.time ?? '—'}
                </Txt>
              </View>
              <Icon name={cfg?.enabled ? 'bell-ring-outline' : 'bell-off-outline'} size={18} color={cfg?.enabled ? colors.night : colors.muted} />
            </Row>
          </View>
        );
      })}
    </View>
  );
}
