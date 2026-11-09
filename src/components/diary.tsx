import { Pressable, ScrollView, Text, View } from 'react-native';

import { DIARY_SLOTS, filledQuarters, formatDuration, getSlot, hourQuarters, setSlots, QUARTERS, slotLabel } from '@/lib/diary-slots';
import { DIARY_HOURS, DIARY_STATES, DIARY_STATE_MAP, WEEK_DAYS, WEEK_DAYS_SHORT, hourLabel } from '@/lib/forms';
import { colors, fonts, radius } from '@/lib/theme';
import type { DiaryState, SleepDiary } from '@/lib/types';

import { Chips, Row, Txt } from './ui';

export type DiaryEntries = SleepDiary['entries'];

/**
 * Horas de sueño de un día, en franjas de 15 min (nocturno = dormido + la mitad
 * de D.N./dormido; diurno = siesta). Cada bloque seguido de D.N. es un despertar.
 */
export function daySummary(entries: DiaryEntries, day: number) {
  const d = entries[String(day)];
  let siesta = 0;
  let noche = 0;
  let despertares = 0;
  let prev: DiaryState | undefined;
  for (const { h, m } of DIARY_SLOTS) {
    const s = getSlot(d, h, m);
    if (s === 'siesta') siesta += 0.25;
    if (s === 'dormido') noche += 0.25;
    if (s === 'dn_dormido') noche += 0.125;
    if ((s === 'despertar' || s === 'dn_dormido') && prev !== s) despertares += 1;
    prev = s;
  }
  // filled = horas rellenadas (96 cuartos = 24 h)
  return { siesta, noche, total: siesta + noche, despertares, filled: filledQuarters(d) / 4 };
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

/**
 * Editor por día: se elige un "pincel" y se tocan las horas.
 * - Tocar la hora (08:00) marca los 60 minutos.
 * - Tocar un cuarto (:15, :30…) marca solo esos 15 minutos.
 */
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
  const d = entries[String(day)];

  const paint = (slots: { h: number; m: number }[]) => {
    if (disabled) return;
    // Si ya estaban todas con el pincel elegido, se borran (tocar de nuevo = borrar)
    const all = slots.every(({ h, m }) => getSlot(d, h, m) === brush);
    onChange({ ...entries, [String(day)]: setSlots(d, slots, all ? null : brush) });
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
            2. Toca la hora para marcar 60 min, o un cuarto para marcar 15 min
          </Txt>
          <Txt variant="small">Ej.: si se durmió a las 21:30, marca «Dormido» en :30 y :45 de las 21:00. Toca de nuevo para borrar.</Txt>
        </View>
      ) : null}
      {DIARY_HOURS.map((h) => {
        const qs = hourQuarters(d, h);
        const whole = qs[0] && qs.every((q) => q === qs[0]) ? DIARY_STATE_MAP[qs[0]] : null;
        return (
          <View key={h} style={{ flexDirection: 'row', alignItems: 'stretch', gap: 4, marginBottom: 4 }}>
            <Pressable
              onPress={() => paint(QUARTERS.map((m) => ({ h, m })))}
              accessibilityRole="button"
              accessibilityLabel={`${hourLabel(h)}, marcar la hora entera`}
              style={{
                width: 64,
                justifyContent: 'center',
                paddingHorizontal: 8,
                borderRadius: radius.sm,
                backgroundColor: whole?.color ?? '#fff',
                borderWidth: 1.5,
                borderColor: whole ? whole.text + '40' : colors.border,
              }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: whole?.text ?? colors.night }}>{hourLabel(h)}</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 9.5, color: colors.muted }}>60 min</Text>
            </Pressable>
            {QUARTERS.map((m, i) => {
              const s = qs[i];
              const info = s ? DIARY_STATE_MAP[s] : null;
              return (
                <Pressable
                  key={m}
                  onPress={() => paint([{ h, m }])}
                  accessibilityRole="button"
                  accessibilityLabel={`${slotLabel(h, m)} ${info?.label ?? 'sin marcar'}`}
                  style={{
                    flex: 1,
                    minHeight: 40,
                    borderRadius: radius.sm,
                    paddingHorizontal: 4,
                    backgroundColor: info?.color ?? '#fff',
                    borderWidth: 1,
                    borderColor: info ? info.text + '33' : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 10, color: info?.text ?? '#B8B3BE' }}>:{String(m).padStart(2, '0')}</Text>
                  {info ? (
                    <Text numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: 10.5, color: info.text }}>
                      {info.short}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        );
      })}
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
              const qs = hourQuarters(entries[String(day)], h);
              const same = qs[0] && qs.every((q) => q === qs[0]) ? DIARY_STATE_MAP[qs[0]] : null;
              return (
                <View key={day} style={{ width: cellW - 2, margin: 1, height: 24, borderRadius: 5, overflow: 'hidden', flexDirection: 'row' }}>
                  {qs.map((q, i) => (
                    <View key={i} style={{ flex: 1, backgroundColor: q ? DIARY_STATE_MAP[q].color : '#F6F2EC', borderLeftWidth: i ? 0.5 : 0, borderColor: '#fff' }} />
                  ))}
                  {same ? (
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 10, fontFamily: fonts.semibold, color: same.text }}>{same.short}</Text>
                    </View>
                  ) : null}
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
                <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.night }}>{s.total ? formatDuration(s.total).replace(' min', '′') : '—'}</Text>
                <Text style={{ fontSize: 9.5, fontFamily: fonts.medium, color: colors.muted }}>
                  {s.filled ? `☾${formatDuration(s.noche).replace(' min', '′')}` : ''}
                </Text>
                <Text style={{ fontSize: 9.5, fontFamily: fonts.medium, color: colors.muted }}>
                  {s.filled ? `☀${formatDuration(s.siesta).replace(' min', '′')}` : ''}
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
        const filled = filledQuarters(entries[String(i)]) / 4;
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
