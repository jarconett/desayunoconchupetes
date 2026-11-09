import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { DiaryWeekTable, Legend, daySummary } from '@/components/diary';
import { DiarySheet, sheetDaysFromDiaries } from '@/components/diary-sheet';
import { Button, Card, Empty, HeroHeader, Loading, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useAdmin } from '@/context/admin';
import { WEEK_DAYS } from '@/lib/forms';
import { formatDuration } from '@/lib/diary-slots';
import { ageInMonths, formatShortDate, parseISODate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { SleepDiary } from '@/lib/types';

export default function DiarioAdmin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const adm = useAdmin();
  const [diary, setDiary] = useState<SleepDiary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from('sleep_diaries')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setDiary(data as SleepDiary | null);
        setLoaded(true);
      });
  }, [id]);

  if (!loaded) return <Loading />;
  if (!diary) return <Screen header={<HeroHeader back title="Diario" />}><Empty title="No encontrado" /></Screen>;
  const child = adm.children.find((c) => c.id === diary.child_id);

  const days = WEEK_DAYS.map((_, i) => daySummary(diary.entries, i)).filter((d) => d.filled > 0);
  const mean = (k: 'noche' | 'siesta' | 'total' | 'despertares') => (days.length ? days.reduce((s, d) => s + d[k], 0) / days.length : null);
  const avg = (k: 'noche' | 'siesta' | 'total') => (mean(k) == null ? '—' : formatDuration(mean(k)!));

  return (
    <Screen
      header={
        <HeroHeader
          back
          title={`Diario · semana ${diary.week_number}`}
          subtitle={`${child?.name ?? ''}${diary.week_start ? ` · semana del ${formatShortDate(diary.week_start)}` : ''}${diary.submitted_at ? ` · enviado ${formatShortDate(diary.submitted_at)}` : ' · borrador'}`}
        />
      }>
      <Row style={{ flexWrap: 'wrap' }} gap={8}>
        <Metric label="Sueño total / día" value={avg('total')} color={colors.nightSoft} />
        <Metric label="Nocturno" value={avg('noche')} color={colors.lavender} />
        <Metric label="Siestas" value={avg('siesta')} color={colors.mint} />
        <Metric label="Despertares / noche" value={mean('despertares') == null ? '—' : mean('despertares')!.toFixed(1).replace('.', ',')} color={colors.rose} />
      </Row>
      <Txt variant="small" style={{ marginTop: 6 }}>
        Medias de {days.length} {days.length === 1 ? 'día registrado' : 'días registrados'} (en franjas de 15 min; D.N./dormido cuenta como la mitad de sueño).
      </Txt>

      <SectionTitle
        icon="table-large"
        action={child ? <Button small variant="ghost" icon="calendar-range" title="Todas las semanas" onPress={() => router.push(`/admin/registro/${child.id}`)} /> : undefined}>
        Registro de sueño (cómputo por categorías)
      </SectionTitle>
      <Card>
        <DiarySheet
          days={sheetDaysFromDiaries([diary])}
          ageMonths={child ? ageInMonths(child.birth_date, diary.week_start ? parseISODate(diary.week_start) : new Date()) : null}
          title={`${child?.name ?? 'peque'}-semana-${diary.week_number}`}
        />
      </Card>

      <SectionTitle icon="table">Tabla semanal</SectionTitle>
      <Card>
        <DiaryWeekTable entries={diary.entries} />
        <View style={{ marginTop: 12 }}>
          <Legend />
        </View>
      </Card>

      {Object.entries(diary.day_notes ?? {}).some(([, v]) => v?.trim()) || diary.notes ? (
        <>
          <SectionTitle icon="comment-text-outline">Notas de la familia</SectionTitle>
          <Card>
            {Object.entries(diary.day_notes ?? {})
              .filter(([, v]) => v?.trim())
              .map(([d, v]) => (
                <Txt key={d} style={{ marginBottom: 6 }}>
                  <Txt style={{ fontFamily: 'Quicksand_700Bold' }}>{WEEK_DAYS[Number(d)]}: </Txt>
                  {v}
                </Txt>
              ))}
            {diary.notes ? <Txt style={{ marginTop: 6 }}>{diary.notes}</Txt> : null}
          </Card>
        </>
      ) : null}

      {child ? (
        <Button title="Ir al plan de sueño" icon="file-document-edit-outline" style={{ marginTop: 18 }} onPress={() => router.push(`/admin/plan/${child.id}`)} />
      ) : null}
    </Screen>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: 140, backgroundColor: color, borderRadius: 16, padding: 12 }}>
      <Txt variant="small" color={colors.night}>
        {label}
      </Txt>
      <Txt variant="h2" color={colors.night}>
        {value}
      </Txt>
    </View>
  );
}
