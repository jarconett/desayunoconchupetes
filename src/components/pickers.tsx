import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { MIN_NOTICE_HOURS, SLOT_END, SLOT_START, SLOT_STEP_MIN, WORK_DAYS } from '@/lib/config';
import { WEEK_DAYS_SHORT } from '@/lib/forms';
import { isValidTime, minutesToTime, monthName, pad, parseISODate, sameDay, timeToMinutes, toISODate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/lib/theme';

import { Icon, Row, Txt } from './ui';

/** Calendario mensual sencillo (funciona igual en web, Android e iOS). */
export function DatePicker({
  value,
  onChange,
  minDate,
  isDisabled,
  marked,
}: {
  value: string | null;
  onChange: (iso: string) => void;
  minDate?: Date;
  isDisabled?: (d: Date) => boolean;
  marked?: Record<string, number>;
}) {
  const initial = value ? parseISODate(value) : new Date();
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const today = new Date();
  const days = useMemo(() => {
    const first = (month.getDay() + 6) % 7;
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array(first).fill(null);
    for (let d = 1; d <= count; d++) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [month]);

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12 }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <Row gap={14}>
          <Pressable accessibilityLabel="Año anterior" onPress={() => setMonth(new Date(month.getFullYear() - 1, month.getMonth(), 1))} hitSlop={8}>
            <Icon name="chevron-double-left" color={colors.muted} />
          </Pressable>
          <Pressable accessibilityLabel="Mes anterior" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} hitSlop={8}>
            <Icon name="chevron-left" color={colors.primaryDark} />
          </Pressable>
        </Row>
        <Txt variant="h3">
          {monthName(month.getMonth())} {month.getFullYear()}
        </Txt>
        <Row gap={14}>
          <Pressable accessibilityLabel="Mes siguiente" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} hitSlop={8}>
            <Icon name="chevron-right" color={colors.primaryDark} />
          </Pressable>
          <Pressable accessibilityLabel="Año siguiente" onPress={() => setMonth(new Date(month.getFullYear() + 1, month.getMonth(), 1))} hitSlop={8}>
            <Icon name="chevron-double-right" color={colors.muted} />
          </Pressable>
        </Row>
      </Row>
      <View style={{ flexDirection: 'row' }}>
        {WEEK_DAYS_SHORT.map((d) => (
          <Text key={d} style={{ flex: 1, textAlign: 'center', fontFamily: fonts.semibold, color: colors.muted, fontSize: 12, marginBottom: 4 }}>
            {d}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {days.map((d, i) => {
          if (!d) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1.2 }} />;
          const iso = toISODate(d);
          const disabled =
            (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) || (isDisabled?.(d) ?? false);
          const selected = value === iso;
          const isToday = sameDay(d, today);
          const mark = marked?.[iso];
          return (
            <Pressable
              key={i}
              disabled={disabled}
              onPress={() => onChange(iso)}
              accessibilityRole="button"
              accessibilityLabel={iso}
              style={{ width: `${100 / 7}%`, aspectRatio: 1.2, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected ? colors.primary : isToday ? colors.primarySoft : 'transparent',
                }}>
                <Text
                  style={{
                    fontFamily: selected ? fonts.bold : fonts.medium,
                    color: selected ? '#fff' : disabled ? '#CFCBD3' : colors.text,
                  }}>
                  {d.getDate()}
                </Text>
                {mark ? (
                  <View style={{ position: 'absolute', bottom: 3, width: 5, height: 5, borderRadius: 3, backgroundColor: selected ? '#fff' : colors.lavenderDark }} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Campo de hora HH:MM con botones de +/- 15 minutos. */
export function TimeInput({ value, onChange, step = 15 }: { value: string; onChange: (v: string) => void; step?: number }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const shift = (d: number) => onChange(minutesToTime(timeToMinutes(isValidTime(value) ? value : '00:00') + d));
  return (
    <Row gap={6}>
      <Pressable onPress={() => shift(-step)} accessibilityLabel="Restar minutos" style={stepBtn}>
        <Icon name="minus" size={18} color={colors.primaryDark} />
      </Pressable>
      <TextInput
        value={text}
        onChangeText={(t) => {
          let v = t.replace(/[^\d:]/g, '');
          if (/^\d{3,4}$/.test(v)) v = `${v.slice(0, v.length - 2)}:${v.slice(-2)}`;
          setText(v);
          const norm = /^\d:\d\d$/.test(v) ? `0${v}` : v;
          if (isValidTime(norm)) onChange(norm);
        }}
        onBlur={() => setText(value)}
        maxLength={5}
        keyboardType="numbers-and-punctuation"
        style={{
          width: 74,
          textAlign: 'center',
          fontFamily: fonts.bold,
          fontSize: 17,
          color: colors.text,
          backgroundColor: '#fff',
          borderRadius: radius.sm,
          borderWidth: 1.5,
          borderColor: colors.border,
          paddingVertical: 6,
        }}
      />
      <Pressable onPress={() => shift(step)} accessibilityLabel="Sumar minutos" style={stepBtn}>
        <Icon name="plus" size={18} color={colors.primaryDark} />
      </Pressable>
    </Row>
  );
}

const stepBtn = {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: colors.primarySoft,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

/** Selector de huecos para citas; marca como ocupados los ya reservados. */
export function SlotPicker({
  date,
  value,
  onChange,
  ignoreId,
  allowAnyTime,
}: {
  date: string;
  value: string | null;
  onChange: (time: string) => void;
  ignoreId?: string;
  allowAnyTime?: boolean;
}) {
  const [busy, setBusy] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    const d = parseISODate(date);
    const from = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const to = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    supabase.rpc('busy_slots', { from_ts: from.toISOString(), to_ts: to.toISOString() }).then(({ data }) => {
      if (cancelled) return;
      const list = ((data as { starts_at: string }[]) ?? []).map((s) => {
        const t = new Date(s.starts_at);
        return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
      });
      setBusy(list);
    });
    return () => {
      cancelled = true;
    };
  }, [date, ignoreId]);

  const slots: string[] = [];
  for (let m = timeToMinutes(SLOT_START); m <= timeToMinutes(SLOT_END) - SLOT_STEP_MIN; m += SLOT_STEP_MIN) slots.push(minutesToTime(m));

  const now = Date.now();
  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {slots.map((s) => {
          const [h, mi] = s.split(':').map(Number);
          const d = parseISODate(date);
          d.setHours(h, mi);
          const tooSoon = !allowAnyTime && d.getTime() < now + MIN_NOTICE_HOURS * 3600000;
          const taken = busy.includes(s) && s !== value;
          const disabled = tooSoon || taken;
          const selected = value === s;
          return (
            <Pressable
              key={s}
              disabled={disabled}
              onPress={() => onChange(s)}
              style={{
                paddingVertical: 9,
                paddingHorizontal: 14,
                borderRadius: radius.pill,
                borderWidth: 1.5,
                borderColor: selected ? colors.primary : colors.border,
                backgroundColor: selected ? colors.primary : disabled ? '#F3F0EC' : '#fff',
              }}>
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  color: selected ? '#fff' : disabled ? '#C2BEC6' : colors.text,
                  textDecorationLine: taken ? 'line-through' : 'none',
                }}>
                {s}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {allowAnyTime ? (
        <View style={{ marginTop: 10 }}>
          <Txt variant="small">Otra hora:</Txt>
          <TimeInput value={value ?? '10:00'} onChange={onChange} />
        </View>
      ) : null}
    </View>
  );
}

export const isWorkDay = (d: Date) => WORK_DAYS.includes(d.getDay());
