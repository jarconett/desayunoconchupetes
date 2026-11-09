import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { FormattedText } from '@/components/plan';
import { Button, Card, Chips, Empty, HeroHeader, Input, Loading, Row, Screen, SectionTitle, Txt, notify } from '@/components/ui';
import { useAdmin } from '@/context/admin';
import { formatDate, interventionWeek } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { SessionSummary } from '@/lib/types';

const TEMPLATE = `CÓMO HA IDO LA SEMANA
-

LO QUE HEMOS HABLADO
-

AJUSTES PARA LA PRÓXIMA SEMANA
-

RECORDAD
- Constancia, calma y paciencia: ¡lo estáis haciendo genial!`;

/** Redactar y enviar el resumen de una sesión de evaluación. */
export default function ResumenEditor() {
  const { childId, cita, id } = useLocalSearchParams<{ childId: string; cita?: string; id?: string }>();
  const adm = useAdmin();
  const child = adm.children.find((c) => c.id === childId);
  const appt = adm.appointments.find((a) => a.id === cita);
  const [existing, setExisting] = useState<SessionSummary | null>(null);
  const [title, setTitle] = useState('');
  const [week, setWeek] = useState<number>(1);
  const [content, setContent] = useState(TEMPLATE);
  const [loaded, setLoaded] = useState(!id);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!child) return;
    const w = appt?.week_number ?? Math.max(1, interventionWeek(child));
    setWeek(w);
    if (!id) setTitle(`Resumen de la sesión · semana ${w}`);
  }, [child, appt, id]);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('session_summaries')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        const s = data as SessionSummary | null;
        if (s) {
          setExisting(s);
          setTitle(s.title);
          setWeek(s.week_number ?? 1);
          setContent(s.content);
        }
        setLoaded(true);
      });
  }, [id]);

  if (adm.loading) return <Loading />;
  if (!child) return <Screen header={<HeroHeader back title="Resumen de sesión" />}><Empty title="No encontrado" /></Screen>;
  if (!loaded) return <Loading />;

  const save = async (send: boolean) => {
    const row = {
      child_id: child.id,
      appointment_id: existing?.appointment_id ?? cita ?? null,
      week_number: week,
      title: title.trim(),
      content,
      sent: send || existing?.sent || false,
    };
    const res = existing
      ? await supabase.from('session_summaries').update(row).eq('id', existing.id)
      : await supabase.from('session_summaries').insert(row);
    if (res.error) return notify('Error', res.error.message);
    await adm.reload();
    notify(send && !existing?.sent ? 'Resumen enviado' : 'Resumen guardado', send && !existing?.sent ? 'La familia recibirá un aviso y lo tendrá en Mi espacio.' : undefined);
    router.back();
  };

  return (
    <Screen
      header={
        <HeroHeader
          back
          title="Resumen de sesión"
          subtitle={`${child.name}${appt ? ` · cita del ${formatDate(appt.starts_at)}` : ''}${existing?.sent ? ' · enviado' : ''}`}
          right={<Button small variant="secondary" icon={preview ? 'pencil-outline' : 'eye-outline'} title={preview ? 'Editar' : 'Vista previa'} onPress={() => setPreview(!preview)} />}
        />
      }>
      {preview ? (
        <Card>
          <Txt variant="h2" style={{ marginBottom: 10 }}>
            {title}
          </Txt>
          <FormattedText text={content} />
        </Card>
      ) : (
        <Card>
          <Input label="Título" value={title} onChangeText={setTitle} />
          <Txt variant="label">Semana</Txt>
          <Chips options={Array.from({ length: child.intervention_weeks }, (_, i) => ({ value: i + 1, label: `${i + 1}` }))} value={week} onChange={setWeek} wrap={false} />
          <View style={{ height: 14 }} />
          <Input label="Resumen" value={content} onChangeText={setContent} multiline style={{ minHeight: 280 }} />
        </Card>
      )}
      <SectionTitle icon="send-outline">Enviar</SectionTitle>
      <Row style={{ flexWrap: 'wrap' }}>
        <Button title={existing?.sent ? 'Guardar cambios' : 'Enviar a la familia'} icon="send" onPress={() => save(true)} disabled={!title.trim() || !content.trim()} />
        {!existing?.sent ? <Button title="Guardar borrador" variant="secondary" onPress={() => save(false)} /> : null}
      </Row>
      <Txt variant="small" style={{ marginTop: 10 }} color={colors.muted}>
        Consejo: empieza una línea con “- ” para crear una lista, o escribe un título en MAYÚSCULAS.
      </Txt>
    </Screen>
  );
}
