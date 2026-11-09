import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { PathologyForm, pathologyProgress } from '@/components/pathology';
import { Button, Card, Empty, HeroHeader, Row, Screen, Txt, confirmAction, notify, Loading } from '@/components/ui';
import { useFamily } from '@/context/family';
import { PATHOLOGY_FORMS } from '@/lib/forms';
import { formatShortDate, pathologyRangeFor } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { PathologyHistory } from '@/lib/types';

export default function Historico() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const fam = useFamily();
  const child = fam.children.find((c) => c.id === childId);
  const existing = fam.pathologies.find((p) => p.child_id === childId);
  const [answers, setAnswers] = useState<PathologyHistory['answers']>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (existing) setAnswers(existing.answers ?? {});
  }, [existing]);

  if (fam.loading) return <Loading />;
  if (!child) return <Screen header={<HeroHeader back title="Histórico de patologías" />}><Empty title="No encontrado" /></Screen>;

  const range = existing?.age_range ?? pathologyRangeFor(child);
  const editable = fam.subscriptionActive && child.status === 'intervencion';
  const progress = pathologyProgress(range, answers);

  const save = async (submit: boolean) => {
    if (submit) {
      if (progress.done < progress.total) {
        const ok = await confirmAction('Faltan respuestas', `Has respondido ${progress.done} de ${progress.total} preguntas. ¿Enviar de todos modos?`, 'Enviar');
        if (!ok) return;
      }
    }
    const { error } = await supabase.from('pathology_histories').upsert({
      child_id: child.id,
      age_range: range,
      answers,
      submitted: submit || existing?.submitted || false,
      submitted_at: submit ? new Date().toISOString() : existing?.submitted_at ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      notify('No se pudo guardar', error.message);
      return;
    }
    setDirty(false);
    await fam.reload();
    if (submit) {
      notify('¡Gracias!', 'Hemos recibido el histórico de patologías.');
      router.back();
    } else notify('Borrador guardado');
  };

  return (
    <Screen header={<HeroHeader back title="Histórico de patologías" subtitle={`${child.name} · ${PATHOLOGY_FORMS[range].title.replace('Histórico de patologías ', '')}`} />}>
      <Card tint={colors.primarySoft}>
        <Txt>Marca SÍ o NO en cada pregunta. Si la respuesta es sí, puedes añadir un comentario.</Txt>
        <Row style={{ marginTop: 8 }}>
          <Txt variant="small" color={colors.primaryDark}>
            {progress.done} de {progress.total} respondidas
          </Txt>
          {existing?.submitted ? (
            <Txt variant="small" color={colors.mintDark}>
              · Enviado el {formatShortDate(existing.submitted_at!)}
            </Txt>
          ) : null}
        </Row>
      </Card>
      <PathologyForm
        range={range}
        answers={answers}
        readOnly={!editable}
        onChange={(a) => {
          setAnswers(a);
          setDirty(true);
        }}
      />
      {editable ? (
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <Button title={existing?.submitted ? 'Guardar cambios' : 'Enviar a la asesora'} icon="send" onPress={() => save(true)} />
          {!existing?.submitted ? <Button title="Guardar borrador" variant="secondary" icon="content-save-outline" onPress={() => save(false)} disabled={!dirty} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}
