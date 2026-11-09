import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { DayTabs, DiaryDayEditor, DiaryWeekTable, daySummary, Legend, type DiaryEntries } from '@/components/diary';
import { Button, Card, Chips, Empty, HeroHeader, Input, Row, Screen, SectionTitle, Txt, confirmAction, notify, Loading } from '@/components/ui';
import { useFamily } from '@/context/family';
import { DIARY_HOURS, DIARY_INSTRUCTIONS, SLEEP_SIGNALS, WEEK_DAYS } from '@/lib/forms';
import { addDays, formatShortDate, parseISODate, startOfWeek, toISODate, weekStartDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { DiaryState } from '@/lib/types';

export default function Diario() {
  const { childId, week: weekParam } = useLocalSearchParams<{ childId: string; week: string }>();
  const week = Number(weekParam) || 1;
  const fam = useFamily();
  const child = fam.children.find((c) => c.id === childId);
  const existing = fam.diaries.find((d) => d.child_id === childId && d.week_number === week);

  const [entries, setEntries] = useState<DiaryEntries>({});
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [day, setDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [brush, setBrush] = useState<DiaryState>('despierto');
  const [view, setView] = useState<'dia' | 'semana'>('dia');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (existing) {
      setEntries(existing.entries ?? {});
      setDayNotes(existing.day_notes ?? {});
      setNotes(existing.notes ?? '');
    }
  }, [existing]);

  if (fam.loading) return <Loading />;
  if (!child) return <Screen header={<HeroHeader back title="Diario de sueño" />}><Empty title="No encontrado" /></Screen>;

  const editable = fam.subscriptionActive && child.status === 'intervencion';
  const startIso = existing?.week_start ?? weekStartDate(child, week) ?? toISODate(startOfWeek(new Date()));
  const start = parseISODate(startIso);
  // Si la semana no empieza en lunes, mostramos la fecha real de cada día
  const dayDate = (i: number) => addDays(startOfWeek(start), i);

  const change = (e: DiaryEntries) => {
    setEntries(e);
    setDirty(true);
  };

  const copyPrevious = () => {
    if (day === 0) return;
    const prev = entries[String(day - 1)];
    if (!prev) return;
    change({ ...entries, [String(day)]: { ...prev } });
  };

  const fillEmpty = () => {
    const d = { ...(entries[String(day)] ?? {}) };
    for (const h of DIARY_HOURS) if (!d[String(h)]) d[String(h)] = brush;
    change({ ...entries, [String(day)]: d });
  };

  const save = async (submit: boolean) => {
    const filledDays = WEEK_DAYS.filter((_, i) => daySummary(entries, i).filled > 0).length;
    if (submit && filledDays < 7) {
      const ok = await confirmAction('¿Enviar el diario?', `Has rellenado ${filledDays} de 7 días. Puedes enviarlo igualmente.`, 'Enviar');
      if (!ok) return;
    }
    const { error } = await supabase.from('sleep_diaries').upsert(
      {
        child_id: child.id,
        week_number: week,
        week_start: toISODate(startOfWeek(start)),
        entries,
        day_notes: dayNotes,
        notes: notes.trim() || null,
        submitted: submit || existing?.submitted || false,
        submitted_at: submit ? new Date().toISOString() : existing?.submitted_at ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'child_id,week_number' },
    );
    if (error) {
      notify('No se pudo guardar', error.message);
      return;
    }
    setDirty(false);
    await fam.reload();
    if (submit) {
      notify('¡Diario enviado!', 'La asesora lo revisará para preparar o ajustar el plan de sueño.');
      router.back();
    }
  };

  const sum = daySummary(entries, day);

  return (
    <Screen
      header={
        <HeroHeader
          back
          title={`Diario · semana ${week}`}
          subtitle={`${child.name} · semana del ${formatShortDate(startOfWeek(start))}${existing?.submitted ? ' · enviado' : ''}`}
        />
      }>
      <Card tint={colors.primarySoft}>
        <Txt variant="small" color={colors.text}>
          {DIARY_INSTRUCTIONS}
        </Txt>
      </Card>

      <View style={{ marginVertical: 12 }}>
        <Chips
          options={[
            { value: 'dia' as const, label: 'Día a día', icon: 'calendar-today' },
            { value: 'semana' as const, label: 'Ver semana', icon: 'table' },
          ]}
          value={view}
          onChange={setView}
        />
      </View>

      {view === 'semana' ? (
        <Card>
          <DiaryWeekTable entries={entries} />
          <View style={{ marginTop: 12 }}>
            <Legend />
          </View>
        </Card>
      ) : (
        <>
          <DayTabs day={day} onChange={setDay} entries={entries} />
          <Card style={{ marginTop: 12 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <Txt variant="h2">
                {WEEK_DAYS[day]} {dayDate(day).getDate()}
              </Txt>
              <Txt variant="small">
                ☾ {sum.noche} h · ☀ {sum.siesta} h · {sum.despertares} D.N.
              </Txt>
            </Row>
            <DiaryDayEditor entries={entries} day={day} brush={brush} onBrush={setBrush} onChange={change} disabled={!editable} />
            {editable ? (
              <Row style={{ marginTop: 12, flexWrap: 'wrap' }} gap={8}>
                {day > 0 ? <Button small variant="soft" icon="content-copy" title="Copiar día anterior" onPress={copyPrevious} /> : null}
                <Button small variant="soft" icon="format-color-fill" title="Rellenar vacías" onPress={fillEmpty} />
              </Row>
            ) : null}
            <View style={{ marginTop: 14 }}>
              <Input
                label="Notas del día (opcional)"
                value={dayNotes[String(day)] ?? ''}
                editable={editable}
                onChangeText={(t) => {
                  setDayNotes({ ...dayNotes, [String(day)]: t });
                  setDirty(true);
                }}
                placeholder="Ej.: le están saliendo dientes, guardería, cambio de hora…"
                multiline
              />
            </View>
          </Card>
        </>
      )}

      <Input
        label="Comentarios de la semana"
        value={notes}
        editable={editable}
        onChangeText={(t) => {
          setNotes(t);
          setDirty(true);
        }}
        multiline
        style={{ backgroundColor: '#fff' }}
      />

      {editable ? (
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Button title={existing?.submitted ? 'Guardar cambios' : 'Enviar diario'} icon="send" onPress={() => save(true)} />
          {!existing?.submitted ? <Button title="Guardar borrador" variant="secondary" icon="content-save-outline" onPress={() => save(false)} disabled={!dirty} /> : null}
        </View>
      ) : null}

      <SectionTitle icon="eye-outline">Señales de sueño según la edad</SectionTitle>
      {SLEEP_SIGNALS.map((s) => (
        <Card key={s.title} style={{ marginBottom: 8 }}>
          <Txt variant="h3">{s.title}</Txt>
          <Txt variant="small" color={colors.text}>
            {s.text}
          </Txt>
        </Card>
      ))}
    </Screen>
  );
}
