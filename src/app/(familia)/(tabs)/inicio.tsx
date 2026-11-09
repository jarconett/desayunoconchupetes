import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppointmentCard } from '@/components/appointments';
import { Timeline } from '@/components/plan';
import { PendingBanner, WeekIndicator } from '@/components/progress';
import { BellButton, Button, Card, Empty, HeroHeader, IconBubble, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useFamily } from '@/context/family';
import { CHILD_STATUS } from '@/lib/config';
import { ageLabel, greeting } from '@/lib/dates';
import { colors } from '@/lib/theme';

export default function Inicio() {
  const { profile } = useAuth();
  const fam = useFamily();
  const [refreshing, setRefreshing] = useState(false);
  const firstName = profile?.full_name?.split(' ')[0] ?? '';

  const upcoming = fam.appointments
    .filter((a) => (a.status === 'confirmada' || a.status === 'solicitada') && new Date(a.starts_at).getTime() > Date.now() - 3600000)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];

  const onRefresh = async () => {
    setRefreshing(true);
    await fam.reload();
    setRefreshing(false);
  };

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={
        <HeroHeader
          showLogo
          title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
          subtitle="Pasito a pasito hacia noches más tranquilas"
          right={<BellButton count={fam.unreadNotifications} onPress={() => router.push('/avisos')} />}
        />
      }>
      <View style={{ marginTop: 4 }}>
        <PendingBanner tasks={fam.tasks} />
      </View>

      {fam.children.length > 0 && !fam.subscriptionActive && fam.children.some((c) => c.status === 'intervencion') ? (
        <Card tint={colors.rose} style={{ marginTop: 12 }}>
          <Row>
            <IconBubble name="card-account-details-outline" bg="#fff" color={colors.roseDark} />
            <View style={{ flex: 1 }}>
              <Txt variant="h3">Suscripción pendiente de activar</Txt>
              <Txt variant="small">
                En cuanto la asesora active tu suscripción podrás completar los documentos de la intervención.
              </Txt>
            </View>
          </Row>
        </Card>
      ) : null}

      {fam.children.length ? (
        <Card onPress={() => router.push('/temporizador')} tint={colors.lavender} style={{ marginTop: 12 }}>
          <Row>
            <IconBubble name="timer-outline" bg="#fff" color={colors.lavenderDark} />
            <View style={{ flex: 1 }}>
              <Txt variant="h3">Temporizador de siesta</Txt>
              <Txt variant="small">Elige cuánto dura la siesta y te avisamos ⏰</Txt>
            </View>
          </Row>
        </Card>
      ) : null}
      {fam.children.length ? (
        <Card onPress={() => router.push('/ruido-blanco')} tint={colors.nightSoft} style={{ marginTop: 10 }}>
          <Row>
            <IconBubble name="waves" bg="#fff" color={colors.night} />
            <View style={{ flex: 1 }}>
              <Txt variant="h3">Ruido blanco</Txt>
              <Txt variant="small">Lluvia, olas, secador, ventilador… con apagado automático 🌙</Txt>
            </View>
          </Row>
        </Card>
      ) : null}

      <SectionTitle icon="baby-face-outline" action={<Button small variant="ghost" icon="plus" title="Añadir" onPress={() => router.push('/peque/nuevo')} />}>
        {fam.children.length > 1 ? 'Mis peques' : 'Mi peque'}
      </SectionTitle>
      {fam.children.length === 0 && !fam.loading ? (
        <Empty
          icon="baby-carriage"
          title="Cuéntanos sobre tu peque"
          text="Añade su nombre y fecha de nacimiento para empezar."
          action={<Button title="Añadir peque" icon="plus" onPress={() => router.push('/peque/nuevo')} />}
        />
      ) : null}
      {fam.children.map((c) => {
        const st = CHILD_STATUS[c.status];
        const plan = fam.plans.find((p) => p.child_id === c.id && p.published);
        return (
          <Card key={c.id} style={{ marginBottom: 12 }}>
            <Row style={{ marginBottom: 14 }}>
              <IconBubble name={c.sex === 'niña' ? 'face-woman-shimmer-outline' : 'baby-face-outline'} bg={colors.peach} color={colors.peachDark} size={52} />
              <View style={{ flex: 1 }}>
                <Txt variant="h2">{c.name}</Txt>
                <Txt variant="small">{ageLabel(c.birth_date)}</Txt>
              </View>
              <View style={{ backgroundColor: st.color, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Txt variant="small" color={st.text}>
                  {st.label}
                </Txt>
              </View>
            </Row>
            <WeekIndicator child={c} />
            {plan ? (
              <View style={{ marginTop: 16 }}>
                <Txt variant="caption" style={{ marginBottom: 6 }}>
                  El día de hoy según el plan
                </Txt>
                <Timeline content={plan.content} reminders={plan.reminders} highlightNow />
                <Button small variant="soft" title="Ver plan completo" icon="weather-night" style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => router.push('/plan')} />
              </View>
            ) : null}
          </Card>
        );
      })}

      <SectionTitle icon="calendar-heart">Próxima cita</SectionTitle>
      {upcoming ? (
        <AppointmentCard appt={upcoming} who={fam.children.find((c) => c.id === upcoming.child_id)?.name} />
      ) : (
        <Empty
          icon="calendar-blank-outline"
          title="No tienes citas próximas"
          action={<Button small title="Solicitar cita" icon="calendar-plus" onPress={() => router.push('/citas')} />}
        />
      )}
    </Screen>
  );
}
