import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { DoneManualTasks, ManualTaskEditor } from '@/components/admin-tasks';
import { AppointmentCard } from '@/components/appointments';
import { DatePicker, SlotPicker } from '@/components/pickers';
import { BellButton, Button, Card, Chips, HeroHeader, Icon, Input, Row, Screen, SectionTitle, Txt, confirmAction, notify } from '@/components/ui';
import { useAdmin } from '@/context/admin';
import { addDays, formatDate, interventionWeek, parseISODate, sameDay, startOfWeek, toISODate } from '@/lib/dates';
import { WEEK_DAYS_SHORT } from '@/lib/forms';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/lib/theme';
import type { Appointment, AppointmentKind } from '@/lib/types';

export default function Agenda() {
  const adm = useAdmin();
  const [tab, setTab] = useState<'calendario' | 'tareas'>('calendario');
  const [selected, setSelected] = useState(toISODate(new Date()));
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const childName = (a: Appointment) => {
    const c = adm.children.find((x) => x.id === a.child_id);
    return `${c?.name ?? 'Sin peque'} · ${adm.familyName(a.family_id)}`;
  };

  const pending = adm.appointments.filter((a) => a.status === 'solicitada');
  const byDay = useMemo(() => {
    const m: Record<string, Appointment[]> = {};
    for (const a of adm.appointments) {
      if (a.status === 'cancelada' || a.status === 'rechazada') continue;
      const k = toISODate(new Date(a.starts_at));
      (m[k] ??= []).push(a);
    }
    return m;
  }, [adm.appointments]);
  const dayList = (byDay[selected] ?? []).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const today = toISODate(new Date());
  const inIntervention = adm.children.filter((c) => c.status === 'intervencion').length;

  const onRefresh = async () => {
    setRefreshing(true);
    await adm.reload();
    setRefreshing(false);
  };

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      header={
        <HeroHeader
          showLogo
          title="Agenda"
          subtitle={formatDate(new Date(), true)}
          right={<BellButton count={adm.unreadNotifications} onPress={() => router.push('/admin/avisos')} />}>
          <Row style={{ marginTop: 16, flexWrap: 'wrap' }} gap={8}>
            <Stat icon="calendar-today" label="Hoy" value={(byDay[today] ?? []).length} color={colors.primarySoft} />
            <Stat icon="calendar-question" label="Por confirmar" value={pending.length} color={colors.butter} />
            <Stat icon="baby-face-outline" label="En intervención" value={inIntervention} color={colors.mint} />
            <Stat icon="format-list-checks" label="Tareas" value={adm.tasks.length} color={colors.rose} />
          </Row>
        </HeroHeader>
      }>
      <Chips
        options={[
          { value: 'calendario' as const, label: 'Calendario', icon: 'calendar-month-outline' },
          { value: 'tareas' as const, label: `Tareas pendientes (${adm.tasks.length})`, icon: 'format-list-checks' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'tareas' ? (
        <AdminTaskList />
      ) : (
        <>
          {pending.length ? (
            <>
              <SectionTitle icon="calendar-question">Solicitudes por confirmar</SectionTitle>
              {pending.map((a) => (
                <AdminAppointment key={a.id} appt={a} who={childName(a)} />
              ))}
            </>
          ) : null}

          <SectionTitle
            icon="calendar-month-outline"
            action={<Button small variant="ghost" icon="plus" title="Nueva cita" onPress={() => setCreating(!creating)} />}>
            Semana
          </SectionTitle>
          {creating ? <NewAppointment onDone={() => setCreating(false)} /> : null}
          <Card style={{ padding: 12 }}>
            <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <Pressable accessibilityLabel="Semana anterior" hitSlop={10} onPress={() => setWeekStart(addDays(weekStart, -7))}>
                <Icon name="chevron-left" color={colors.primaryDark} />
              </Pressable>
              <Pressable
                onPress={() => {
                  setWeekStart(startOfWeek(new Date()));
                  setSelected(today);
                }}>
                <Txt variant="h3">
                  {weekStart.getDate()}/{weekStart.getMonth() + 1} – {addDays(weekStart, 6).getDate()}/{addDays(weekStart, 6).getMonth() + 1}
                </Txt>
              </Pressable>
              <Pressable accessibilityLabel="Semana siguiente" hitSlop={10} onPress={() => setWeekStart(addDays(weekStart, 7))}>
                <Icon name="chevron-right" color={colors.primaryDark} />
              </Pressable>
            </Row>
            <Row gap={6}>
              {WEEK_DAYS_SHORT.map((d, i) => {
                const date = addDays(weekStart, i);
                const iso = toISODate(date);
                const count = (byDay[iso] ?? []).length;
                const isSel = iso === selected;
                return (
                  <Pressable
                    key={d}
                    onPress={() => setSelected(iso)}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: 8,
                      borderRadius: radius.md,
                      backgroundColor: isSel ? colors.night : sameDay(date, new Date()) ? colors.primarySoft : 'transparent',
                    }}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: isSel ? '#fff' : colors.muted }}>{d}</Text>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 17, color: isSel ? '#fff' : colors.text }}>{date.getDate()}</Text>
                    <View style={{ flexDirection: 'row', gap: 2, height: 6, marginTop: 2 }}>
                      {Array.from({ length: Math.min(count, 4) }, (_, k) => (
                        <View key={k} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isSel ? '#fff' : colors.lavenderDark }} />
                      ))}
                    </View>
                  </Pressable>
                );
              })}
            </Row>
          </Card>

          <SectionTitle icon="clock-outline">{formatDate(selected, true)}</SectionTitle>
          {dayList.length === 0 ? <Txt variant="small">No hay citas este día.</Txt> : null}
          {dayList.map((a) => (
            <AdminAppointment key={a.id} appt={a} who={childName(a)} />
          ))}
        </>
      )}
    </Screen>
  );
}

function Stat({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: 120, backgroundColor: color, borderRadius: radius.md, padding: 12 }}>
      <Row gap={6}>
        <Icon name={icon} size={18} color={colors.night} />
        <Txt variant="small" color={colors.night}>
          {label}
        </Txt>
      </Row>
      <Txt variant="h1" color={colors.night}>
        {value}
      </Txt>
    </View>
  );
}

export function AdminAppointment({ appt, who }: { appt: Appointment; who: string }) {
  const adm = useAdmin();
  const [editing, setEditing] = useState(false);
  const [link, setLink] = useState(appt.meeting_link ?? '');
  const [notes, setNotes] = useState(appt.admin_notes ?? '');
  const [date, setDate] = useState(toISODate(new Date(appt.starts_at)));
  const [time, setTime] = useState<string | null>(null);

  const update = async (patch: Partial<Appointment>, msg?: string) => {
    const { error } = await supabase.from('appointments').update(patch).eq('id', appt.id);
    if (error) notify('Error', error.message);
    else if (msg) notify(msg);
    await adm.reload();
  };

  const saveEdit = async () => {
    const patch: Partial<Appointment> = { meeting_link: link.trim() || null, admin_notes: notes.trim() || null };
    if (time) {
      const [h, m] = time.split(':').map(Number);
      const d = parseISODate(date);
      d.setHours(h, m, 0, 0);
      patch.starts_at = d.toISOString();
    }
    await update(patch, 'Cita actualizada');
    setEditing(false);
  };

  const isPast = new Date(appt.starts_at).getTime() < Date.now();
  const summaryDone = adm.summaries.some((s) => s.appointment_id === appt.id);

  return (
    <View>
      <AppointmentCard
        appt={appt}
        who={who}
        actions={
          <>
            {appt.status === 'solicitada' ? (
              <>
                <Button small icon="check" title="Confirmar" onPress={() => update({ status: 'confirmada' }, 'Cita confirmada. La familia recibirá un aviso.')} />
                <Button
                  small
                  variant="danger"
                  icon="close"
                  title="No disponible"
                  onPress={async () => {
                    if (await confirmAction('Rechazar cita', 'La familia recibirá un aviso para elegir otro horario.', 'Rechazar')) update({ status: 'rechazada' });
                  }}
                />
              </>
            ) : null}
            {appt.status === 'confirmada' ? (
              <>
                <Button small icon="check-all" title="Realizada" variant={isPast ? 'primary' : 'soft'} onPress={() => update({ status: 'realizada' })} />
                <Button
                  small
                  variant="danger"
                  icon="close"
                  title="Cancelar"
                  onPress={async () => {
                    if (await confirmAction('Cancelar cita', 'Se avisará a la familia.', 'Cancelar cita')) update({ status: 'cancelada' });
                  }}
                />
              </>
            ) : null}
            {appt.status === 'realizada' && appt.kind === 'evaluacion_semanal' && appt.child_id ? (
              <Button
                small
                icon={summaryDone ? 'email-check-outline' : 'email-edit-outline'}
                variant={summaryDone ? 'soft' : 'primary'}
                title={summaryDone ? 'Resumen enviado' : 'Escribir resumen'}
                onPress={() => router.push(`/admin/resumen/${appt.child_id}?cita=${appt.id}`)}
              />
            ) : null}
            {appt.status === 'realizada' && appt.kind === 'entrevista_inicial' && appt.child_id ? (
              <Button small icon="clipboard-edit-outline" title="Ficha de sueño" onPress={() => router.push(`/admin/ficha/${appt.child_id}`)} />
            ) : null}
            <Button small variant="ghost" icon="pencil-outline" title="Editar" onPress={() => setEditing(!editing)} />
            {appt.child_id ? <Button small variant="ghost" icon="baby-face-outline" title="Ficha del peque" onPress={() => router.push(`/admin/nino/${appt.child_id}`)} /> : null}
          </>
        }
      />
      {editing ? (
        <Card style={{ marginTop: -4, marginBottom: 12 }} tint={colors.primarySoft}>
          <Input label="Enlace de videollamada" value={link} onChangeText={setLink} autoCapitalize="none" placeholder="https://meet.google.com/…" />
          <Input label="Nota para la familia" value={notes} onChangeText={setNotes} multiline />
          <Txt variant="label">Reprogramar (opcional)</Txt>
          <DatePicker value={date} onChange={setDate} />
          <View style={{ height: 10 }} />
          <SlotPicker date={date} value={time} onChange={setTime} allowAnyTime ignoreId={appt.id} />
          <Row style={{ marginTop: 12 }}>
            <Button title="Guardar" icon="content-save-outline" onPress={saveEdit} />
            <Button title="Cerrar" variant="ghost" onPress={() => setEditing(false)} />
          </Row>
        </Card>
      ) : null}
    </View>
  );
}

function NewAppointment({ onDone }: { onDone: () => void }) {
  const adm = useAdmin();
  const [childId, setChildId] = useState<string | null>(null);
  const [kind, setKind] = useState<AppointmentKind>('evaluacion_semanal');
  const [week, setWeek] = useState(1);
  const [date, setDate] = useState<string>(toISODate(new Date()));
  const [time, setTime] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const child = adm.children.find((c) => c.id === childId);
  const matches = adm.children.filter((c) => `${c.name} ${adm.familyName(c.family_id)}`.toLowerCase().includes(search.toLowerCase())).slice(0, 8);

  const create = async () => {
    if (!child || !time) return;
    const [h, m] = time.split(':').map(Number);
    const d = parseISODate(date);
    d.setHours(h, m, 0, 0);
    const { error } = await supabase.from('appointments').insert({
      family_id: child.family_id,
      child_id: child.id,
      kind,
      week_number: kind === 'evaluacion_semanal' ? week : null,
      starts_at: d.toISOString(),
      status: 'confirmada',
    });
    if (error) {
      notify('Error', error.message);
      return;
    }
    await adm.reload();
    notify('Cita creada y confirmada');
    onDone();
  };

  return (
    <Card style={{ marginBottom: 12 }}>
      <Txt variant="h3" style={{ marginBottom: 8 }}>
        Nueva cita
      </Txt>
      <Input placeholder="Buscar peque o familia…" value={search} onChangeText={setSearch} />
      <Chips
        options={matches.map((c) => ({ value: c.id, label: `${c.name} · ${adm.familyName(c.family_id)}` }))}
        value={childId}
        onChange={(id) => {
          setChildId(id);
          const c = adm.children.find((x) => x.id === id);
          if (c) {
            setKind(c.status === 'intervencion' ? 'evaluacion_semanal' : 'entrevista_inicial');
            setWeek(Math.max(1, interventionWeek(c)));
          }
        }}
      />
      <Txt variant="label" style={{ marginTop: 12 }}>
        Tipo
      </Txt>
      <Chips
        options={[
          { value: 'entrevista_inicial' as AppointmentKind, label: 'Entrevista inicial' },
          { value: 'evaluacion_semanal' as AppointmentKind, label: 'Evaluación semanal' },
        ]}
        value={kind}
        onChange={setKind}
      />
      {kind === 'evaluacion_semanal' ? (
        <View style={{ marginTop: 10 }}>
          <Chips options={Array.from({ length: child?.intervention_weeks ?? 6 }, (_, i) => ({ value: i + 1, label: `Sem. ${i + 1}` }))} value={week} onChange={setWeek} wrap={false} />
        </View>
      ) : null}
      <View style={{ height: 12 }} />
      <DatePicker value={date} onChange={setDate} />
      <View style={{ height: 10 }} />
      <SlotPicker date={date} value={time} onChange={setTime} allowAnyTime />
      <Row style={{ marginTop: 12 }}>
        <Button title="Crear cita" icon="calendar-plus" onPress={create} disabled={!child || !time} />
        <Button title="Cancelar" variant="ghost" onPress={onDone} />
      </Row>
    </Card>
  );
}

function AdminTaskList() {
  const adm = useAdmin();
  const [title, setTitle] = useState('');
  const [childId, setChildId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<string | null>(null);

  const allTasks = adm.tasks;
  const groups = useMemo(() => {
    const g: Record<string, typeof allTasks> = {};
    for (const t of allTasks) (g[t.childName ?? 'General'] ??= []).push(t);
    return Object.entries(g);
  }, [allTasks]);

  const add = async () => {
    const { error } = await supabase.from('admin_tasks').insert({ title: title.trim(), child_id: childId });
    if (error) notify('Error', error.message);
    setTitle('');
    adm.reload();
  };

  const complete = async (id: string) => {
    await supabase.from('admin_tasks').update({ done: true }).eq('id', id);
    adm.reload();
  };

  return (
    <View>
      <Card style={{ marginTop: 14 }}>
        <Txt variant="h3" style={{ marginBottom: 8 }}>
          Añadir tarea
        </Txt>
        <Input value={title} onChangeText={setTitle} placeholder="Ej.: llamar a Lucía para revisar la siesta" />
        <Chips
          options={[{ value: '' as string, label: 'General' }, ...adm.children.filter((c) => c.status !== 'finalizada').map((c) => ({ value: c.id, label: c.name }))]}
          value={childId ?? ''}
          onChange={(v) => setChildId(v || null)}
          wrap={false}
        />
        <Button title="Añadir" icon="plus" small style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={add} disabled={!title.trim()} />
      </Card>

      <DoneManualTasks onOpen={setEditTask} />
      <ManualTaskEditor taskId={editTask} onClose={() => setEditTask(null)} />

      {groups.length === 0 ? (
        <Card tint={colors.mint} style={{ marginTop: 14 }}>
          <Txt variant="h3">¡Todo al día! 🌙</Txt>
        </Card>
      ) : null}
      {groups.map(([name, list]) => (
        <View key={name}>
          <SectionTitle icon={name === 'General' ? 'clipboard-list-outline' : 'baby-face-outline'}>{name}</SectionTitle>
          {list.map((t) => (
            <Card
              key={t.id}
              // Las tareas manuales se gestionan en una ventana; el resto lleva a su pantalla (nunca a la Agenda otra vez)
              onPress={t.manualId ? () => setEditTask(t.manualId!) : t.link === '/admin/agenda' ? undefined : () => router.push(t.link as never)}
              style={{ marginBottom: 8, padding: 12 }}>
              <Row>
                {t.manualId ? (
                  <Pressable accessibilityLabel="Marcar como realizada" hitSlop={10} onPress={() => complete(t.manualId!)}>
                    <Icon name="checkbox-blank-circle-outline" color={colors.primary} />
                  </Pressable>
                ) : (
                  <Icon name={t.icon} color={colors.primaryDark} />
                )}
                <View style={{ flex: 1 }}>
                  <Txt variant="h3" style={{ fontSize: 15 }}>
                    {t.title}
                  </Txt>
                  {t.detail ? <Txt variant="small">{t.detail}</Txt> : null}
                </View>
                {t.manualId ? (
                  <Icon name="dots-horizontal" color={colors.muted} />
                ) : t.link === '/admin/agenda' ? null : (
                  <Icon name="chevron-right" color={colors.muted} />
                )}
              </Row>
            </Card>
          ))}
        </View>
      ))}
    </View>
  );
}
