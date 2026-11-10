import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { DiarySheet, sheetDaysFromDiaries } from '@/components/diary-sheet';
import { Card, Empty, HeroHeader, Loading, Screen } from '@/components/ui';
import { useAdmin } from '@/context/admin';
import { ageInMonths } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { SleepDiary } from '@/lib/types';

/** Registro de sueño completo del peque: todas las semanas en una sola hoja. */
export default function RegistroCompleto() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const adm = useAdmin();
  const child = adm.children.find((c) => c.id === childId);
  const [diaries, setDiaries] = useState<SleepDiary[] | null>(null);

  useEffect(() => {
    if (!childId) return;
    supabase
      .from('sleep_diaries')
      .select('*')
      .eq('child_id', childId)
      .order('week_number')
      .then(({ data }) => setDiaries((data as SleepDiary[]) ?? []));
  }, [childId]);

  if (!diaries) return <Loading />;
  return (
    <Screen wide header={<HeroHeader back title="Registro de sueño" subtitle={`${child?.name ?? ''} · todas las semanas`} />}>
      {diaries.length === 0 ? (
        <Empty icon="notebook-outline" title="Sin diarios todavía" text="Cuando la familia rellene el diario de sueño aparecerá aquí." />
      ) : (
        <Card>
          <DiarySheet days={sheetDaysFromDiaries(diaries, child)} ageMonths={child ? ageInMonths(child.birth_date) : null} title={`${child?.name ?? 'peque'}-registro-completo`} />
        </Card>
      )}
    </Screen>
  );
}
