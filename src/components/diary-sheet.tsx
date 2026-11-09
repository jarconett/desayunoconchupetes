import { Platform, ScrollView, Text, View } from 'react-native';

import { DIARY_HOURS, DIARY_STATES, DIARY_STATE_MAP } from '@/lib/forms';
import { daytimeSleepPercentile, totalSleepPercentile, type PercentileResult } from '@/lib/percentiles';
import { colors, fonts, radius } from '@/lib/theme';
import type { DiaryState } from '@/lib/types';

import { Button, Row, Txt } from './ui';

/** Un día del registro (una fila de la hoja). */
export interface SheetDay {
  key: string;
  /** Texto de la fecha, p. ej. "Lu 14/10" */
  label: string;
  /** Semana de intervención (para separar bloques) */
  week: number;
  /** hora (0..23) -> estado */
  hours: Record<string, DiaryState>;
  note?: string;
}

const STATE_KEYS: DiaryState[] = ['despierto', 'siesta', 'rutina', 'dormido', 'despertar', 'dn_dormido'];

/** Cómputo exacto de un día: horas de cada categoría y totales. */
export function computeDay(hours: Record<string, DiaryState>) {
  const count = Object.fromEntries(STATE_KEYS.map((k) => [k, 0])) as Record<DiaryState, number>;
  let filled = 0;
  let nocheDespertares = 0;
  let prev: DiaryState | undefined;
  for (const h of DIARY_HOURS) {
    const s = hours[String(h)];
    if (!s) {
      prev = undefined;
      continue;
    }
    filled++;
    count[s]++;
    // Cada bloque seguido de D.N. cuenta como un despertar
    if ((s === 'despertar' || s === 'dn_dormido') && prev !== s) nocheDespertares++;
    prev = s;
  }
  const nocturno = count.dormido + count.dn_dormido * 0.5;
  const siestas = count.siesta;
  return { count, filled, nocturno, siestas, total: nocturno + siestas, despertares: nocheDespertares };
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));

const W = { date: 74, num: 44, cat: 40, hour: 24 };

const CAT_COLS: { key: DiaryState; label: string }[] = DIARY_STATES.map((s) => ({ key: s.key, label: s.short }));

function HeaderCell({ w, children, bg }: { w: number; children: string; bg?: string }) {
  return (
    <View style={{ width: w, paddingVertical: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
      <Text style={{ fontFamily: fonts.bold, fontSize: 10.5, color: colors.night, textAlign: 'center' }}>{children}</Text>
    </View>
  );
}

function NumCell({ w, value, bg, bold, color }: { w: number; value: string; bg?: string; bold?: boolean; color?: string }) {
  return (
    <View style={{ width: w, height: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
      <Text style={{ fontFamily: bold ? fonts.bold : fonts.semibold, fontSize: 11.5, color: color ?? colors.text }}>{value}</Text>
    </View>
  );
}

function PercentileLine({ label, hours, res }: { label: string; hours: number; res: PercentileResult | null }) {
  if (!res) return null;
  const color = res.level === 0 ? colors.mintDark : Math.abs(res.level) === 1 ? colors.butterDark : colors.roseDark;
  return (
    <Txt variant="small" style={{ marginTop: 2 }}>
      <Text style={{ fontFamily: fonts.bold, color: colors.text }}>{label}: </Text>
      {fmt(Math.round(hours * 10) / 10)} h → <Text style={{ fontFamily: fonts.bold, color }}>{res.band}</Text> (mediana para su edad {fmt(res.p50)} h)
    </Txt>
  );
}

/**
 * Registro de sueño en formato hoja (como el Excel): una fila por día, una
 * columna por hora (de 8:00 a 7:00) y el cómputo exacto de horas por categoría.
 */
export function DiarySheet({ days, ageMonths, title }: { days: SheetDay[]; ageMonths: number | null; title?: string }) {
  const rows = days.map((d) => ({ ...d, c: computeDay(d.hours) }));
  const filled = rows.filter((r) => r.c.filled > 0);
  const complete = filled.filter((r) => r.c.filled >= 24);
  // Como en el Excel, la media se hace con los días completos (si los hay)
  const base = complete.length ? complete : filled;
  const avg = (f: (r: (typeof rows)[number]) => number) => (base.length ? base.reduce((s, r) => s + f(r), 0) / base.length : 0);
  const avgTotal = avg((r) => r.c.total);
  const avgSiestas = avg((r) => r.c.siestas);
  const hourSleepCount = DIARY_HOURS.map(
    (h) => rows.filter((r) => ['siesta', 'dormido', 'dn_dormido'].includes(r.hours[String(h)] ?? '')).length,
  );
  const maxHourCount = Math.max(1, ...hourSleepCount);

  const exportCsv = () => {
    const header = ['Fecha', 'Semana', 'Sueño total', 'Nocturno', 'Siestas', ...CAT_COLS.map((c) => DIARY_STATE_MAP[c.key].label), 'Despertares', ...DIARY_HOURS.map((h) => `${h}:00`), 'Notas'];
    const lines = rows.map((r) =>
      [
        r.label,
        r.week,
        fmt(r.c.total),
        fmt(r.c.nocturno),
        fmt(r.c.siestas),
        ...CAT_COLS.map((c) => r.c.count[c.key]),
        r.c.despertares,
        ...DIARY_HOURS.map((h) => (r.hours[String(h)] ? DIARY_STATE_MAP[r.hours[String(h)]].short : '')),
        (r.note ?? '').replace(/[\r\n;]+/g, ' '),
      ].join(';'),
    );
    const csv = '﻿' + [header.join(';'), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(title ?? 'registro-sueno').replace(/[^\w-]+/g, '_')}.csv`;
    a.click();
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          {/* Cabecera */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border }}>
            <HeaderCell w={W.date}>Fecha</HeaderCell>
            <HeaderCell w={W.num} bg={colors.nightSoft}>Total</HeaderCell>
            <HeaderCell w={W.num} bg={colors.lavender}>Noct.</HeaderCell>
            <HeaderCell w={W.num} bg={colors.mint}>Siestas</HeaderCell>
            {CAT_COLS.map((c) => (
              <HeaderCell key={c.key} w={W.cat} bg={DIARY_STATE_MAP[c.key].color}>
                {c.label}
              </HeaderCell>
            ))}
            <View style={{ width: 8 }} />
            {DIARY_HOURS.map((h) => (
              <HeaderCell key={h} w={W.hour}>
                {String(h)}
              </HeaderCell>
            ))}
          </View>

          {/* Días */}
          {rows.map((r, i) => {
            const newWeek = i > 0 && rows[i - 1].week !== r.week;
            const incomplete = r.c.filled > 0 && r.c.filled < 24;
            return (
              <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: newWeek ? 2 : 0, borderColor: colors.lavenderDark }}>
                <View style={{ width: W.date, height: 24, justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 11, color: r.c.filled ? colors.text : '#C2BEC6' }}>
                    {r.label}
                    {incomplete ? ' *' : ''}
                  </Text>
                </View>
                <NumCell w={W.num} value={r.c.filled ? fmt(r.c.total) : ''} bold bg="#F4F6FB" />
                <NumCell w={W.num} value={r.c.filled ? fmt(r.c.nocturno) : ''} bg="#F7F4FB" />
                <NumCell w={W.num} value={r.c.filled ? fmt(r.c.siestas) : ''} bg="#F3FAF6" />
                {CAT_COLS.map((c) => (
                  <NumCell key={c.key} w={W.cat} value={r.c.filled && r.c.count[c.key] ? String(r.c.count[c.key]) : ''} color={DIARY_STATE_MAP[c.key].text} />
                ))}
                <View style={{ width: 8 }} />
                {DIARY_HOURS.map((h) => {
                  const s = r.hours[String(h)];
                  const info = s ? DIARY_STATE_MAP[s] : null;
                  return (
                    <View
                      key={h}
                      style={{
                        width: W.hour - 2,
                        height: 22,
                        margin: 1,
                        borderRadius: 4,
                        backgroundColor: info?.color ?? '#F6F2EC',
                        borderWidth: info ? 1 : 0,
                        borderColor: info ? info.text + '40' : undefined,
                      }}
                    />
                  );
                })}
              </View>
            );
          })}

          {/* Media */}
          <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1.5, borderColor: colors.night, marginTop: 2 }}>
            <View style={{ width: W.date, height: 26, justifyContent: 'center' }}>
              <Text style={{ fontFamily: fonts.bold, fontSize: 11.5, color: colors.night }}>MEDIA</Text>
            </View>
            <NumCell w={W.num} value={base.length ? fmt(Math.round(avgTotal * 10) / 10) : '—'} bold bg={colors.nightSoft} />
            <NumCell w={W.num} value={base.length ? fmt(Math.round(avg((r) => r.c.nocturno) * 10) / 10) : '—'} bold bg={colors.lavender} />
            <NumCell w={W.num} value={base.length ? fmt(Math.round(avgSiestas * 10) / 10) : '—'} bold bg={colors.mint} />
            {CAT_COLS.map((c) => (
              <NumCell key={c.key} w={W.cat} value={base.length ? fmt(Math.round(avg((r) => r.c.count[c.key]) * 10) / 10) : '—'} bold color={DIARY_STATE_MAP[c.key].text} />
            ))}
            <View style={{ width: 8 }} />
            {hourSleepCount.map((n, i) => (
              <View
                key={i}
                style={{
                  width: W.hour - 2,
                  height: 22,
                  margin: 1,
                  borderRadius: 4,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: n ? `rgba(70,85,122,${0.12 + (0.7 * n) / maxHourCount})` : '#F6F2EC',
                }}>
                <Text style={{ fontSize: 10, fontFamily: fonts.bold, color: n / maxHourCount > 0.5 ? '#fff' : colors.night }}>{n || ''}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={{ marginTop: 10 }}>
        <Txt variant="small">
          Cada casilla = 1 hora (de 8:00 a 7:00 del día siguiente). Columnas de categorías = horas exactas de cada estado. Nocturno = Dormido + ½ de
          D.N./dormido. Media calculada con {base.length} {complete.length ? 'días completos' : 'días registrados'}
          {complete.length && filled.length > complete.length ? ` (se excluyen ${filled.length - complete.length} días incompletos, marcados con *)` : ''}. Fila
          inferior: nº de días que estaba durmiendo a esa hora.
        </Txt>
        {base.length ? (
          <View style={{ marginTop: 8, padding: 10, borderRadius: radius.md, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border }}>
            <Txt variant="label">Percentiles de sueño (Iglowstein 2003)</Txt>
            {ageMonths == null ? <Txt variant="small">Añade la fecha de nacimiento del peque para ver los percentiles.</Txt> : null}
            <PercentileLine label="Sueño total" hours={avgTotal} res={totalSleepPercentile(ageMonths, avgTotal)} />
            <PercentileLine label="Sueño diurno (siestas)" hours={avgSiestas} res={daytimeSleepPercentile(ageMonths, avgSiestas)} />
          </View>
        ) : null}
        <Row gap={8} style={{ flexWrap: 'wrap', marginTop: 8 }}>
          {DIARY_STATES.map((s) => (
            <Row key={s.key} gap={4}>
              <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: s.color, borderWidth: 1, borderColor: s.text + '55' }} />
              <Txt variant="small">
                {s.short} = {s.label}
              </Txt>
            </Row>
          ))}
        </Row>
        {Platform.OS === 'web' && filled.length ? (
          <Button title="Descargar en Excel (CSV)" icon="microsoft-excel" variant="secondary" small style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={exportCsv} />
        ) : null}
      </View>
    </View>
  );
}

/** Convierte diarios semanales en filas de la hoja (un día por fila, con su fecha). */
export function sheetDaysFromDiaries(
  diaries: { week_number: number; week_start: string | null; entries: Record<string, Record<string, DiaryState>>; day_notes?: Record<string, string> }[],
): SheetDay[] {
  const SHORT = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  return [...diaries]
    .sort((a, b) => a.week_number - b.week_number)
    .flatMap((d) =>
      SHORT.map((wd, day) => {
        let label = `S${d.week_number} ${wd}`;
        if (d.week_start) {
          const [y, m, dd] = d.week_start.split('-').map(Number);
          const date = new Date(y, m - 1, dd + day);
          label = `${wd} ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        }
        return {
          key: `${d.week_number}-${day}`,
          label,
          week: d.week_number,
          hours: d.entries?.[String(day)] ?? {},
          note: d.day_notes?.[String(day)],
        };
      }),
    );
}
