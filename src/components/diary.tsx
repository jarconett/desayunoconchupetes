import { Pressable, ScrollView, Text, View } from 'react-native';

import { DIARY_HOURS, DIARY_STATES, DIARY_STATE_MAP, WEEK_DAYS, WEEK_DAYS_SHORT, hourLabel } from '@/lib/forms';
import { colors, fonts, radius } from '@/lib/theme';
import type { DiaryState, SleepDiary } from '@/lib/types';

import { Chips, Icon, Row, Txt } from './ui';

export type DiaryEntries = SleepDiary['entries'];

/** Horas de sueño de un día (nocturno = dormido + D.N./dormido medio; diurno = siesta). */
export function daySummary(entries: DiaryEntries, day: number) {
  const d = entries[String(day)] ?? {};
  let siesta = 0;
  let noche = 0;
  let despertares = 0;
  for (const h of DIARY_HOURS) {
    const s = d[String(h)];
    if (s === 'siesta') siesta += 1;
    if (s === 'dormido') noche += 1;
    if (s === 'dn_dormido') {
      noche += 0.5;
      despertares += 1;
    }
    if (s === 'despertar') despertares += 1;
  }
  return { siesta, noche, total: siesta + noche, despertares, filled: Object.keys(d).length };
}

export function Legend() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {DIARY_STATES.map((s) => (
        <Row key={s.key} gap={5}>
          <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: s.color, borderWidth: 1, borderColor: s.text + '55' }} />
          <Txt variant="small">{s.label}</Txt>
        </Row>
      ))}
    </View>
  );
}

/** Editor por día: se elige un "pincel" y se tocan las horas. */
export function DiaryDayEditor({
  entries,
  day,
  brush,
  onBrush,
  onChange,
  disabled,
}: {
  entries: DiaryEntries;
  day: number;
  brush: DiaryState;
  onBrush: (b: DiaryState) => void;
  onChange: (next: DiaryEntries) => void;
  disabled?: boolean;
}) {
  const d = entries[String(day)] ?? {};
  const setHour = (h: number) => {
    if (disabled) return;
    const cur = d[String(h)];
    const nextDay = { ...d };
    if (cur === brush) delete nextDay[String(h)];
    else nextDay[String(h)] = brush;
    onChange({ ...entries, [String(day)]: nextDay });
  };

  return (
    <View>
      {!disabled ? (
        <View style={{ marginBottom: 12 }}>
          <Txt variant="label">1. Elige qué estaba haciendo</Txt>
          <Chips
            options={DIARY_STATES.map((s) => ({ value: s.key, label: s.label, icon: s.icon }))}
            value={brush}
            onChange={onBrush}
          />
          <Txt variant="label" style={{ marginTop: 12 }}>
            2. Toca las horas para marcarlas (toca de nuevo para borrar)
          </Txt>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {DIARY_HOURS.map((h) => {
          const s = d[String(h)] as DiaryState | undefined;
          const info = s ? DIARY_STATE_MAP[s] : null;
          return (
            <Pressable
              key={h}
              onPress={() => setHour(h)}
              accessibilityRole="button"
              accessibilityLabel={`${hourLabel(h)} ${info?.label ?? 'sin marcar'}`}
              style={{
                width: '31%',
                minWidth: 92,
                flexGrow: 1,
                paddingVertical: 8,
                paddingHorizontal: 8,
                borderRadius: radius.sm,
                backgroundColor: info?.color ?? '#fff',
                borderWidth: 1.5,
                borderColor: info ? info.text + '33' : colors.border,
              }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: info?.text ?? colors.muted }}>{hourLabel(h)}</Text>
              <Row gap={4} style={{ marginTop: 2 }}>
                {info ? <Icon name={info.icon} size={13} color={info.text} /> : null}
                <Text numberOfLines={1} style={{ fontFamily: fonts.medium, fontSize: 11.5, color: info?.text ?? '#C2BEC6', flexShrink: 1 }}>
                  {info?.label ?? '—'}
                </Text>
              </Row>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Tabla semanal completa (como la plantilla en papel). */
export function DiaryWeekTable({ entries }: { entries: DiaryEntries }) {
  const cellW = 62;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 54 }} />
          {WEEK_DAYS.map((d) => (
            <Text key={d} style={{ width: cellW, textAlign: 'center', fontFamily: fonts.bold, fontSize: 12, color: colors.night, paddingVertical: 6 }}>
              {d.slice(0, 3)}
            </Text>
          ))}
        </View>
        {DIARY_HOURS.map((h) => (
          <View key={h} style={{ flexDirection: 'row' }}>
            <Text style={{ width: 54, fontFamily: fonts.semibold, fontSize: 12, color: colors.muted, paddingVertical: 4 }}>{hourLabel(h)}</Text>
            {WEEK_DAYS.map((_, day) => {
              const s = entries[String(day)]?.[String(h)] as DiaryState | undefined;
              const info = s ? DIARY_STATE_MAP[s] : null;
              return (
                <View
                  key={day}
                  style={{
                    width: cellW - 2,
                    margin: 1,
                    height: 24,
                    borderRadius: 5,
                    backgroundColor: info?.color ?? '#F6F2EC',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontSize: 10, fontFamily: fonts.semibold, color: info?.text ?? '#C8C3CC' }}>{info?.short ?? ''}</Text>
                </View>
              );
            })}
          </View>
        ))}
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          <Text style={{ width: 54, fontFamily: fonts.bold, fontSize: 11, color: colors.text }}>Sueño</Text>
          {WEEK_DAYS.map((_, day) => {
            const s = daySummary(entries, day);
            return (
              <View key={day} style={{ width: cellW, alignItems: 'center' }}>
                <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.night }}>{s.total ? `${s.total}h` : '—'}</Text>
                <Text style={{ fontSize: 10, fontFamily: fonts.medium, color: colors.muted }}>
                  {s.filled ? `☾${s.noche} ☀${s.siesta}` : ''}
                </Text>
                <Text style={{ fontSize: 10, fontFamily: fonts.medium, color: colors.roseDark }}>{s.despertares ? `${s.despertares} D.N.` : ''}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

export function DayTabs({ day, onChange, entries }: { day: number; onChange: (d: number) => void; entries: DiaryEntries }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {WEEK_DAYS_SHORT.map((d, i) => {
        const filled = Object.keys(entries[String(i)] ?? {}).length;
        const selected = i === day;
        return (
          <Pressable
            key={i}
            onPress={() => onChange(i)}
            accessibilityLabel={WEEK_DAYS[i]}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              borderRadius: radius.md,
              backgroundColor: selected ? colors.night : '#fff',
              borderWidth: 1,
              borderColor: selected ? colors.night : colors.border,
            }}>
            <Text style={{ fontFamily: fonts.bold, color: selected ? '#fff' : colors.text }}>{d}</Text>
            <View
              style={{
                marginTop: 4,
                width: 18,
                height: 4,
                borderRadius: 2,
                backgroundColor: filled >= 24 ? colors.mintDark : filled > 0 ? colors.butterDark : colors.border,
              }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
