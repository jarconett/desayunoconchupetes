import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { FormattedText } from '@/components/plan';
import { Card, Empty, HeroHeader, Screen, Txt, Loading } from '@/components/ui';
import { useFamily } from '@/context/family';
import { formatDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';

export default function Resumen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const fam = useFamily();
  const s = fam.summaries.find((x) => x.id === id);
  const child = fam.children.find((c) => c.id === s?.child_id);

  const summaryId = s?.id;
  const unread = !!s && !s.read_at;
  const { reload } = fam;
  useEffect(() => {
    if (summaryId && unread) {
      supabase
        .from('session_summaries')
        .update({ read_at: new Date().toISOString() })
        .eq('id', summaryId)
        .then(() => reload());
    }
  }, [summaryId, unread, reload]);

  if (fam.loading) return <Loading />;
  if (!s) return <Screen header={<HeroHeader back title="Resumen de sesión" />}><Empty title="No encontrado" /></Screen>;

  return (
    <Screen header={<HeroHeader back title={s.title} subtitle={`${child?.name ?? ''}${s.week_number ? ` · semana ${s.week_number}` : ''} · ${formatDate(s.created_at)}`} />}>
      <Card>
        <FormattedText text={s.content} />
      </Card>
      <Txt variant="small" center style={{ marginTop: 14 }}>
        Con cariño, Desayuno con Chupetes 💙
      </Txt>
    </Screen>
  );
}
