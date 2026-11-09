import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { AppointmentCard } from '@/components/appointments';
import { DatePicker, SlotPicker, isWorkDay } from '@/components/pickers';
import { Button, Card, Chips, Empty, HeroHeader, Input, Screen, SectionTitle, Txt, confirmAction, notify } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useFamily } from '@/context/family';
import { APPOINTMENT_LABEL, MIN_NOTICE_HOURS } from '@/lib/config';
import { addDays, formatDate, interventionWeek, parseISODate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { Appointment, AppointmentKind } from '@/lib/types';

export default function Citas() {
  const { session } = useAuth();
  const fam = useFamily();
  const [showForm, setShowForm] = useState(false);
  const [childId, setChildId] = useState<string | null>(null);
  const [kind, setKind] = useState<AppointmentKind>('entrevista_inicial');
  const [week, setWeek] = useState(1);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [modality, setModality] = useState<Appointment['modality']>('videollamada');
  const [notes, setNotes] = useState('');

  const child = fam.children.find((c) => c.id === childId) ?? null;

  useEffect(() => {
    if (!childId && fam.children.length) setChildId(fam.children[0].id);
  }, [fam.children, childId]);

  useEffect(() => {
    if (!child) return;
    if (child.status === 'intervencion') {
      setKind('evaluacion_semanal');
      setWeek(Math.max(1, interventionWeek(child)));
    } else setKind('entrevista_inicial');
  }, [child]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now() - 3600000;
    const up = fam.appointments
      .filter((a) => new Date(a.starts_at).getTime() >= now && (a.status === 'solicitada' || a.status === 'confirmada'))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const rest = fam.appointments.filter((a) => !up.includes(a));
    return { upcoming: up, past: rest };
  }, [fam.appointments]);

  const minDate = addDays(new Date(), Math.ceil(MIN_NOTICE_HOURS / 24) - 1);

  const submit = async () => {
    if (!session || !child || !date || !time) return;
    const [h, m] = time.split(':').map(Number);
    const d = parseISODate(date);
    d.setHours(h, m, 0, 0);
    const { error } = await supabase.from('appointments').insert({
      family_id: session.user.id,
      child_id: child.id,
      kind,
      week_number: kind === 'evaluacion_semanal' ? week : null,
      starts_at: d.toISOString(),
      modality,
      family_notes: notes.trim() || null,
      status: 'solicitada',
    });
    if (error) {
      notify('No se pudo solicitar la cita', error.message);
      return;
    }
    notify('¡Solicitud enviada!', 'Te avisaremos en cuanto la asesora confirme la cita.');
    setShowForm(false);
    setDate(null);
    setTime(null);
    setNotes('');
    fam.reload();
  };

  const cancel = async (a: Appointment) => {
    const ok = await confirmAction('Cancelar cita', '¿Seguro que quieres cancelar esta cita?', 'Cancelar cita');
    if (!ok) return;
    const { error } = await supabase.from('appointments').update({ status: 'cancelada' }).eq('id', a.id);
    if (error) notify('Error', error.message);
    fam.reload();
  };

  const interviewTaken =
    child && fam.appointments.some((a) => a.child_id === child.id && a.kind === 'entrevista_inicial' && ['solicitada', 'confirmada', 'realizada'].includes(a.status));

  return (
    <Screen header={<HeroHeader title="Citas" subtitle="Entrevista inicial y evaluaciones semanales" />}>
      {fam.children.length === 0 ? (
        <Empty
          icon="baby-face-outline"
          title="Primero, añade a tu peque"
          text="Necesitamos sus datos para preparar la entrevista inicial."
          action={<Button title="Añadir peque" icon="plus" onPress={() => router.push('/peque/nuevo')} />}
        />
      ) : !showForm ? (
        <Button title="Solicitar una cita" icon="calendar-plus" onPress={() => setShowForm(true)} style={{ marginTop: 4 }} />
      ) : (
        <Card>
          <Txt variant="h2" style={{ marginBottom: 12 }}>
            Nueva cita
          </Txt>
          {fam.children.length > 1 ? (
            <>
              <Txt variant="label">¿Para quién?</Txt>
              <Chips options={fam.children.map((c) => ({ value: c.id, label: c.name }))} value={childId} onChange={setChildId} />
              <View style={{ height: 14 }} />
            </>
          ) : null}
          <Txt variant="label">Tipo de cita</Txt>
          <Chips
            options={[
              { value: 'entrevista_inicial' as AppointmentKind, label: APPOINTMENT_LABEL.entrevista_inicial, icon: 'account-heart-outline', disabled: !!interviewTaken },
              { value: 'evaluacion_semanal' as AppointmentKind, label: APPOINTMENT_LABEL.evaluacion_semanal, icon: 'calendar-check-outline', disabled: child?.status !== 'intervencion' },
            ]}
            value={kind}
            onChange={setKind}
          />
          {kind === 'evaluacion_semanal' && child ? (
            <>
              <Txt variant="label" style={{ marginTop: 14 }}>
                Semana de la intervención
              </Txt>
              <Chips options={Array.from({ length: child.intervention_weeks }, (_, i) => ({ value: i + 1, label: `Semana ${i + 1}` }))} value={week} onChange={setWeek} wrap={false} />
            </>
          ) : null}
          <Txt variant="label" style={{ marginTop: 14 }}>
            Elige el día
          </Txt>
          <DatePicker
            value={date}
            onChange={(d) => {
              setDate(d);
              setTime(null);
            }}
            minDate={minDate}
            isDisabled={(d) => !isWorkDay(d)}
          />
          {date ? (
            <>
              <Txt variant="label" style={{ marginTop: 14 }}>
                Horas disponibles · {formatDate(date, true)}
              </Txt>
              <SlotPicker date={date} value={time} onChange={setTime} />
            </>
          ) : null}
          <Txt variant="label" style={{ marginTop: 14 }}>
            Modalidad
          </Txt>
          <Chips
            options={[
              { value: 'videollamada' as const, label: 'Videollamada', icon: 'video-outline' },
              { value: 'llamada' as const, label: 'Llamada', icon: 'phone-outline' },
              { value: 'presencial' as const, label: 'Presencial', icon: 'home-heart' },
            ]}
            value={modality}
            onChange={setModality}
          />
          <View style={{ height: 14 }} />
          <Input label="¿Quieres contarnos algo? (opcional)" value={notes} onChangeText={setNotes} multiline placeholder="Por ejemplo: preferimos por la tarde, esta semana ha estado malito…" />
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Button title="Enviar solicitud" icon="send" onPress={submit} disabled={!date || !time || !child} />
            <Button title="Cancelar" variant="ghost" onPress={() => setShowForm(false)} />
          </View>
        </Card>
      )}

      <SectionTitle icon="calendar-clock">Próximas</SectionTitle>
      {upcoming.length === 0 ? <Txt variant="small">No hay citas próximas.</Txt> : null}
      {upcoming.map((a) => (
        <AppointmentCard
          key={a.id}
          appt={a}
          who={fam.children.find((c) => c.id === a.child_id)?.name}
          actions={<Button small variant="danger" icon="close" title="Cancelar" onPress={() => cancel(a)} />}
        />
      ))}

      {past.length ? (
        <>
          <SectionTitle icon="history">Historial</SectionTitle>
          {past.map((a) => (
            <AppointmentCard key={a.id} appt={a} who={fam.children.find((c) => c.id === a.child_id)?.name} />
          ))}
        </>
      ) : null}
      <Txt variant="small" center style={{ marginTop: 18 }} color={colors.muted}>
        Las citas se solicitan con al menos {MIN_NOTICE_HOURS} h de antelación. La asesora las confirmará lo antes posible.
      </Txt>
    </Screen>
  );
}
