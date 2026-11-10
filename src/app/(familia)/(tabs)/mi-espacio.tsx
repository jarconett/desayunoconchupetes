import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { WeekIndicator } from '@/components/progress';
import { Badge, Button, Card, Empty, HeroHeader, IconBubble, Input, ListItem, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useFamily } from '@/context/family';
import { DESCANSO_DOC_KEY, PATHOLOGY_RANGE_LABEL } from '@/lib/forms';
import { diaryDays, formatShortDate, interventionWeek, pathologyRangeFor, weekStartDate } from '@/lib/dates';
import { colors } from '@/lib/theme';
import type { Child } from '@/lib/types';

export default function MiEspacio() {
  const fam = useFamily();
  return (
    <Screen header={<HeroHeader title="Mi espacio" subtitle="Tus documentos de la asesoría, siempre a mano" />}>
      {fam.children.length === 0 && !fam.loading ? (
        <Empty icon="folder-heart-outline" title="Aún no hay nada por aquí" text="Añade a tu peque y solicita la entrevista inicial para empezar." />
      ) : null}
      {fam.children.map((c) => (
        <ChildSpace key={c.id} child={c} multiple={fam.children.length > 1} />
      ))}
    </Screen>
  );
}

function ChildSpace({ child, multiple }: { child: Child; multiple: boolean }) {
  const fam = useFamily();
  const read = fam.reads.includes(DESCANSO_DOC_KEY);
  const unlocked = child.status !== 'entrevista';
  const canEdit = fam.subscriptionActive && child.status === 'intervencion';
  const week = interventionWeek(child);
  const range = pathologyRangeFor(child);
  const ph = fam.pathologies.find((p) => p.child_id === child.id);
  const plan = fam.plans.find((p) => p.child_id === child.id && p.published);
  const summaries = fam.summaries.filter((s) => s.child_id === child.id);

  return (
    <View style={{ marginBottom: 12 }}>
      {multiple ? (
        <Txt variant="h2" style={{ marginTop: 12 }}>
          {child.name}
        </Txt>
      ) : null}

      {!unlocked ? <InterventionRequestCard child={child} /> : null}

      {unlocked ? (
        <Card style={{ marginTop: 10 }}>
          <WeekIndicator child={child} />
        </Card>
      ) : null}

      {unlocked && !fam.subscriptionActive && child.status === 'intervencion' ? (
        <Card tint={colors.rose} style={{ marginTop: 10 }}>
          <Txt variant="h3">Suscripción no activa</Txt>
          <Txt variant="small">Podrás completar los documentos cuando la asesora active tu suscripción.</Txt>
        </Card>
      ) : null}

      <SectionTitle icon="book-open-page-variant-outline">Para leer</SectionTitle>
      <ListItem
        icon="book-open-page-variant-outline"
        iconBg={colors.lavender}
        iconColor={colors.lavenderDark}
        title="1, 2, 3 DESCANSO"
        subtitle="Ambiente, siestas y rutinas"
        locked={!unlocked}
        onPress={() => router.push('/descanso')}
        right={unlocked ? <Badge label={read ? 'Leído' : 'Pendiente'} bg={read ? colors.mint : colors.butter} color={read ? colors.mintDark : colors.butterDark} /> : undefined}
      />
      <ListItem
        icon="weather-night"
        iconBg={colors.nightSoft}
        iconColor={colors.night}
        title="Plan de sueño"
        subtitle={plan ? `Actualizado el ${formatShortDate(plan.updated_at)} · versión ${plan.version}` : 'Lo recibirás tras el primer diario de sueño'}
        locked={!plan}
        onPress={() => router.push('/plan')}
      />
      <ListItem
        icon="shield-account-outline"
        iconBg={colors.mint}
        iconColor={colors.mintDark}
        title="Protección de datos"
        subtitle="Información y consentimiento firmado"
        onPress={() => router.push(`/proteccion-datos/${child.id}`)}
      />
      <ListItem
        icon="cookie-outline"
        iconBg={colors.butter}
        iconColor={colors.butterDark}
        title="Política de cookies"
        onPress={() => router.push('/politica-cookies')}
      />

      <SectionTitle icon="pencil-outline">Para completar</SectionTitle>
      <ListItem
        icon="stethoscope"
        iconBg={colors.peach}
        iconColor={colors.peachDark}
        title="Histórico de patologías"
        subtitle={PATHOLOGY_RANGE_LABEL[range]}
        locked={!unlocked}
        onPress={() => router.push(`/historico/${child.id}`)}
        right={
          unlocked ? (
            <Badge label={ph?.submitted ? 'Enviado' : ph ? 'Borrador' : 'Pendiente'} bg={ph?.submitted ? colors.mint : colors.butter} color={ph?.submitted ? colors.mintDark : colors.butterDark} />
          ) : undefined
        }
      />
      {Array.from({ length: child.intervention_weeks }, (_, i) => i + 1).map((w) => {
        const diary = fam.diaries.find((d) => d.child_id === child.id && d.week_number === w);
        const available = unlocked && (w <= Math.max(week, 1) || !!diary);
        return (
          <ListItem
            key={w}
            icon="notebook-heart-outline"
            iconBg={colors.mint}
            iconColor={colors.mintDark}
            title={`Diario de sueño · semana ${w}`}
            subtitle={available ? (diary?.submitted ? `Enviado el ${formatShortDate(diary.submitted_at!)}` : 'Registro semanal hora a hora') : unlockText(child, w)}
            locked={!available}
            onPress={() => router.push(`/diario/${child.id}/${w}`)}
            right={
              available ? (
                <Badge label={diary?.submitted ? 'Enviado' : diary ? 'Borrador' : 'Pendiente'} bg={diary?.submitted ? colors.mint : colors.butter} color={diary?.submitted ? colors.mintDark : colors.butterDark} />
              ) : undefined
            }
          />
        );
      })}
      {!canEdit && unlocked ? (
        <Txt variant="small" style={{ marginBottom: 6 }}>
          Los documentos se pueden consultar, pero solo se pueden editar durante la intervención con la suscripción activa.
        </Txt>
      ) : null}

      <SectionTitle icon="email-heart-outline">Resúmenes de sesión</SectionTitle>
      {summaries.length === 0 ? <Txt variant="small">Después de cada evaluación semanal encontrarás aquí el resumen.</Txt> : null}
      {summaries.map((s) => (
        <ListItem
          key={s.id}
          icon="email-heart-outline"
          iconBg={colors.rose}
          iconColor={colors.roseDark}
          title={s.title}
          subtitle={`${s.week_number ? `Semana ${s.week_number} · ` : ''}${formatShortDate(s.created_at)}`}
          onPress={() => router.push(`/resumen/${s.id}`)}
          right={!s.read_at ? <Badge label="Nuevo" bg={colors.rose} color={colors.roseDark} /> : undefined}
        />
      ))}
    </View>
  );
}

function InterventionRequestCard({ child }: { child: Child }) {
  const { session } = useAuth();
  const fam = useFamily();
  const [message, setMessage] = useState('');
  const req = fam.requests.find((r) => r.child_id === child.id);
  const interviewDone = fam.appointments.some(
    (a) => a.child_id === child.id && a.kind === 'entrevista_inicial' && (a.status === 'confirmada' || a.status === 'realizada'),
  );

  // Antes de solicitar la intervención hay que leer y firmar el documento de protección de datos
  const send = () => {
    if (!session) return;
    router.push({ pathname: '/proteccion-datos/[childId]', params: { childId: child.id, solicitar: '1', mensaje: message.trim() } });
  };

  if (req?.status === 'pendiente') {
    return (
      <Card tint={colors.butter} style={{ marginTop: 10 }}>
        <Row>
          <IconBubble name="timer-sand" bg="#fff" color={colors.butterDark} />
          <View style={{ flex: 1 }}>
            <Txt variant="h3">Solicitud de intervención enviada</Txt>
            <Txt variant="small">Te avisaremos cuando la asesora la acepte.</Txt>
          </View>
        </Row>
      </Card>
    );
  }

  return (
    <Card tint={colors.lavender} style={{ marginTop: 10 }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <IconBubble name="star-shooting-outline" bg="#fff" color={colors.lavenderDark} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3">Intervención de 6 semanas</Txt>
          <Txt variant="small">
            {interviewDone
              ? 'Si tras la entrevista inicial queréis comenzar, solicitad la intervención. Se desbloquearán el histórico de patologías, el diario de sueño y el documento 1,2,3 DESCANSO.'
              : 'Primero realizaremos la entrevista inicial. Después podréis solicitar la intervención desde aquí.'}
          </Txt>
          {req?.status === 'rechazada' ? (
            <Txt variant="small" color={colors.roseDark} style={{ marginTop: 6 }}>
              Tu solicitud anterior no se pudo aceptar. Contacta con nosotras si tienes dudas.
            </Txt>
          ) : null}
        </View>
      </Row>
      {interviewDone ? (
        <View style={{ marginTop: 12 }}>
          <Input value={message} onChangeText={setMessage} placeholder="Mensaje para la asesora (opcional)" multiline />
          <Button title="Solicitar la intervención" icon="heart-outline" onPress={send} />
          <Txt variant="small" style={{ marginTop: 6 }}>
            Antes de enviarla te pediremos que leas y firmes el documento de protección de datos.
          </Txt>
        </View>
      ) : null}
    </Card>
  );
}

/** «Se desbloquea el miércoles 25/11» según la fecha de inicio de la intervención */
function unlockText(child: Child, week: number) {
  const start = weekStartDate(child, week);
  if (!start) return 'Se desbloquea cuando empiece esa semana';
  const d = diaryDays(start)[0];
  return `Se desbloquea el ${d.name.toLowerCase()} ${formatShortDate(start).slice(0, 5)}`;
}
