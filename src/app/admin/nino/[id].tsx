import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppointmentCard } from '@/components/appointments';
import { PathologyForm } from '@/components/pathology';
import { DatePicker } from '@/components/pickers';
import { DoneManualTasks, ManualTaskEditor } from '@/components/admin-tasks';
import { PendingBanner, WeekIndicator } from '@/components/progress';
import { Badge, Button, Card, Chips, Empty, HeroHeader, Input, ListItem, Row, Screen, SectionTitle, Txt, confirmAction, notify, Loading } from '@/components/ui';
import { useAdmin } from '@/context/admin';
import { CHILD_STATUS } from '@/lib/config';
import { PATHOLOGY_RANGE_LABEL } from '@/lib/forms';
import { addDays, ageLabel, formatDate, formatShortDate, interventionWeek, parseISODate, pathologyRangeFor, startOfWeek, toISODate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { PathologyHistory, PathologyRange } from '@/lib/types';

export default function NinoDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const adm = useAdmin();
  const child = adm.children.find((c) => c.id === id);
  const [pathology, setPathology] = useState<PathologyHistory | null>(null);
  const [showPathology, setShowPathology] = useState(false);
  const [editingStart, setEditingStart] = useState(false);
  const [startDate, setStartDate] = useState<string>(toISODate(addDays(startOfWeek(new Date()), 7)));
  const [weeks, setWeeks] = useState(6);
  const [taskTitle, setTaskTitle] = useState('');
  const [editTask, setEditTask] = useState<string | null>(null);
  const [consents, setConsents] = useState<{ version: string; signer_name: string | null; signer_dni: string | null; created_at: string }[] | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('consents')
      .select('version, signer_name, signer_dni, created_at')
      .eq('child_id', id)
      .eq('kind', 'proteccion_datos')
      .eq('accepted', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setConsents(data ?? []));
  }, [id, adm.requests]);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('pathology_histories')
      .select('*')
      .eq('child_id', id)
      .maybeSingle()
      .then(({ data }) => setPathology((data as PathologyHistory) ?? null));
  }, [id, adm.pathologies]);

  useEffect(() => {
    if (child?.intervention_start) setStartDate(child.intervention_start);
    if (child) setWeeks(child.intervention_weeks);
  }, [child]);

  if (adm.loading) return <Loading />;
  if (!child) return <Screen header={<HeroHeader back title="Peque" />}><Empty title="No encontrado" /></Screen>;

  const family = adm.profiles.find((p) => p.id === child.family_id);
  const sub = adm.subscriptions.find((s) => s.family_id === child.family_id);
  const request = adm.requests.find((r) => r.child_id === child.id && r.status === 'pendiente');
  const appts = adm.appointments.filter((a) => a.child_id === child.id).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  const diaries = adm.diaries.filter((d) => d.child_id === child.id);
  const plan = adm.plans.find((p) => p.child_id === child.id);
  const summaries = adm.summaries.filter((s) => s.child_id === child.id);
  const sheet = adm.sheets.find((s) => s.child_id === child.id);
  const tasks = adm.tasks.filter((t) => t.childId === child.id);
  const week = interventionWeek(child);
  const range = pathologyRangeFor(child);

  const startIntervention = async () => {
    const ok = await confirmAction(
      'Comenzar intervención',
      `Se desbloquearán los documentos para la familia. Inicio: ${formatDate(startDate)} · ${weeks} semanas.${sub?.status !== 'activa' ? '\n\nTambién se activará su suscripción.' : ''}`,
      'Comenzar',
    );
    if (!ok) return;
    const { error } = await supabase.from('children').update({ status: 'intervencion', intervention_start: startDate, intervention_weeks: weeks }).eq('id', child.id);
    if (error) return notify('Error', error.message);
    if (request) await supabase.from('intervention_requests').update({ status: 'aceptada', resolved_at: new Date().toISOString() }).eq('id', request.id);
    if (sub?.status !== 'activa') {
      await supabase.from('subscriptions').upsert({
        family_id: child.family_id,
        status: 'activa',
        start_date: startDate,
        end_date: toISODate(addDays(parseISODate(startDate), weeks * 7 + 7)),
      });
    }
    await adm.reload();
    notify('¡Intervención iniciada!', 'La familia ya tiene acceso a sus documentos.');
  };

  const rejectRequest = async () => {
    if (!request) return;
    if (!(await confirmAction('Rechazar solicitud', 'Se avisará a la familia.', 'Rechazar'))) return;
    await supabase.from('intervention_requests').update({ status: 'rechazada', resolved_at: new Date().toISOString() }).eq('id', request.id);
    adm.reload();
  };

  const saveDates = async () => {
    const { error } = await supabase.from('children').update({ intervention_start: startDate, intervention_weeks: weeks }).eq('id', child.id);
    if (error) notify('Error', error.message);
    setEditingStart(false);
    adm.reload();
  };

  const setStatus = async (status: 'finalizada' | 'intervencion') => {
    const ok = await confirmAction(status === 'finalizada' ? 'Finalizar intervención' : 'Reabrir intervención', '¿Confirmas el cambio?');
    if (!ok) return;
    await supabase.from('children').update({ status }).eq('id', child.id);
    adm.reload();
  };

  const setRange = async (r: PathologyRange) => {
    await supabase.from('children').update({ pathology_range: r }).eq('id', child.id);
    adm.reload();
  };

  const addTask = async () => {
    await supabase.from('admin_tasks').insert({ title: taskTitle.trim(), child_id: child.id });
    setTaskTitle('');
    adm.reload();
  };

  return (
    <Screen
      header={
        <HeroHeader back title={child.name} subtitle={`${ageLabel(child.birth_date)} · ${family?.full_name ?? ''}${child.parents_names ? ` (${child.parents_names})` : ''}`}>
          <Row style={{ marginTop: 10, flexWrap: 'wrap' }} gap={8}>
            <Badge label={CHILD_STATUS[child.status].label} bg={CHILD_STATUS[child.status].color} color={CHILD_STATUS[child.status].text} />
            <Badge label={`Suscripción: ${sub?.status ?? 'sin suscripción'}`} bg="#fff" color={colors.night} />
          </Row>
        </HeroHeader>
      }>
      <Card>
        <WeekIndicator child={child} />
        {child.intervention_start ? (
          <Txt variant="small" style={{ marginTop: 8 }}>
            Inicio {formatShortDate(child.intervention_start)} · fin previsto {formatShortDate(addDays(parseISODate(child.intervention_start), child.intervention_weeks * 7 - 1))}
          </Txt>
        ) : null}
      </Card>

      {tasks.length ? (
        <View style={{ marginTop: 12 }}>
          <PendingBanner tasks={tasks} title="Pendiente con este peque" here={`/admin/nino/${child.id}`} onManualTask={setEditTask} />
        </View>
      ) : null}

      {child.status === 'entrevista' || editingStart ? (
        <Card tint={colors.lavender} style={{ marginTop: 12 }}>
          {request && child.status === 'entrevista' ? (
            <>
              <Txt variant="h3">La familia ha solicitado la intervención</Txt>
              {request.message ? <Txt style={{ marginTop: 4 }}>“{request.message}”</Txt> : null}
              <Txt variant="small">Recibida el {formatShortDate(request.created_at)}</Txt>
            </>
          ) : (
            <Txt variant="h3">{child.status === 'entrevista' ? 'Iniciar intervención' : 'Fechas de la intervención'}</Txt>
          )}
          <Txt variant="label" style={{ marginTop: 12 }}>
            Fecha de inicio · {formatDate(startDate, true)}
          </Txt>
          <DatePicker value={startDate} onChange={setStartDate} />
          <Txt variant="label" style={{ marginTop: 12 }}>
            Duración
          </Txt>
          <Chips options={[4, 5, 6, 7, 8].map((n) => ({ value: n, label: `${n} semanas` }))} value={weeks} onChange={setWeeks} />
          {child.status === 'intervencion' ? (
            <Txt variant="small" style={{ marginTop: 10 }}>
              🔗 Al guardar se actualizan también la suscripción de la familia (inicio y fin) y las semanas del diario, y se avisa a la familia del
              cambio.
            </Txt>
          ) : null}
          <Row style={{ marginTop: 14, flexWrap: 'wrap' }}>
            {child.status === 'entrevista' ? (
              <>
                <Button title="Aceptar y comenzar" icon="star-shooting-outline" onPress={startIntervention} />
                {request ? <Button title="Rechazar" variant="danger" onPress={rejectRequest} /> : null}
              </>
            ) : (
              <>
                <Button title="Guardar fechas" icon="content-save-outline" onPress={saveDates} />
                <Button title="Cerrar" variant="ghost" onPress={() => setEditingStart(false)} />
              </>
            )}
          </Row>
        </Card>
      ) : (
        <Row style={{ marginTop: 12, flexWrap: 'wrap' }} gap={8}>
          <Button small variant="soft" icon="calendar-edit" title="Cambiar fechas" onPress={() => setEditingStart(true)} />
          {child.status === 'intervencion' ? (
            <Button small variant="soft" icon="flag-checkered" title="Finalizar intervención" onPress={() => setStatus('finalizada')} />
          ) : (
            <Button small variant="soft" icon="restore" title="Reabrir intervención" onPress={() => setStatus('intervencion')} />
          )}
        </Row>
      )}

      <SectionTitle icon="folder-account-outline">Documentos</SectionTitle>
      {(() => {
        const main = (consents ?? []).find((c) => !c.version.endsWith(':estudios'));
        const studies = (consents ?? []).some((c) => c.version.endsWith(':estudios'));
        return (
          <ListItem
            icon={main ? 'shield-check-outline' : 'shield-alert-outline'}
            iconBg={main ? colors.mint : colors.rose}
            iconColor={main ? colors.mintDark : colors.roseDark}
            title="Protección de datos"
            subtitle={
              consents === null
                ? 'Cargando…'
                : main
                  ? `Firmado por ${main.signer_name ?? '—'}${main.signer_dni ? ` (${main.signer_dni})` : ''} el ${formatShortDate(main.created_at)}${studies ? ' · autoriza uso anonimizado para estudios' : ' · no autoriza estudios'}`
                  : 'Sin firmar (se firma al solicitar la intervención)'
            }
          />
        );
      })()}
      <ListItem
        icon="clipboard-text-outline"
        iconBg={colors.butter}
        iconColor={colors.butterDark}
        title="Ficha de sueño (entrevista inicial)"
        subtitle={sheet ? `Actualizada el ${formatShortDate(sheet.updated_at)}` : 'Pendiente de completar'}
        onPress={() => router.push(`/admin/ficha/${child.id}`)}
      />
      <ListItem
        icon="file-document-edit-outline"
        iconBg={colors.nightSoft}
        iconColor={colors.night}
        title="Plan de sueño"
        subtitle={plan ? `${plan.published ? 'Publicado' : 'Borrador'} · versión ${plan.version} · ${formatShortDate(plan.updated_at)}` : diaries.some((d) => d.submitted) ? 'Listo para preparar' : 'Tras el primer diario'}
        onPress={() => router.push(`/admin/plan/${child.id}`)}
      />
      <ListItem
        icon="stethoscope"
        iconBg={colors.peach}
        iconColor={colors.peachDark}
        title="Histórico de patologías"
        subtitle={`${PATHOLOGY_RANGE_LABEL[range]} · ${pathology?.submitted ? `enviado ${formatShortDate(pathology.submitted_at!)}` : pathology ? 'borrador' : 'sin empezar'}`}
        onPress={() => setShowPathology(!showPathology)}
        right={<Badge label={showPathology ? 'Ocultar' : 'Ver'} />}
      />
      {showPathology ? (
        <Card style={{ marginBottom: 10 }}>
          <Txt variant="label">Documento según edad</Txt>
          <Chips
            options={(['4-7', '8-12', '12-24'] as PathologyRange[]).map((r) => ({ value: r, label: PATHOLOGY_RANGE_LABEL[r] }))}
            value={range}
            onChange={setRange}
          />
          {pathology ? <PathologyForm range={pathology.age_range} answers={pathology.answers} readOnly /> : <Txt variant="small" style={{ marginTop: 10 }}>La familia aún no ha empezado el histórico.</Txt>}
        </Card>
      ) : null}

      <SectionTitle
        icon="notebook-heart-outline"
        action={diaries.length ? <Button small variant="ghost" icon="table-large" title="Registro completo" onPress={() => router.push(`/admin/registro/${child.id}`)} /> : undefined}>
        Diarios de sueño
      </SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {Array.from({ length: child.intervention_weeks }, (_, i) => i + 1).map((w) => {
          const d = diaries.find((x) => x.week_number === w);
          const isCurrent = w === week && child.status === 'intervencion';
          return (
            <Card
              key={w}
              onPress={d ? () => router.push(`/admin/diario/${d.id}`) : undefined}
              tint={d?.submitted ? colors.mint : d ? colors.butter : undefined}
              style={{ flexGrow: 1, flexBasis: 100, padding: 12, borderWidth: isCurrent ? 2 : 1, borderColor: isCurrent ? colors.lavenderDark : colors.border }}>
              <Txt variant="h3">Semana {w}</Txt>
              <Txt variant="small">{d?.submitted ? `Enviado ${formatShortDate(d.submitted_at!)}` : d ? 'En curso' : 'Sin datos'}</Txt>
            </Card>
          );
        })}
      </View>

      <SectionTitle icon="email-heart-outline" action={<Button small variant="ghost" icon="plus" title="Nuevo" onPress={() => router.push(`/admin/resumen/${child.id}`)} />}>
        Resúmenes de sesión
      </SectionTitle>
      {summaries.length === 0 ? <Txt variant="small">Aún no hay resúmenes.</Txt> : null}
      {summaries.map((s) => (
        <ListItem
          key={s.id}
          icon="email-outline"
          iconBg={colors.rose}
          iconColor={colors.roseDark}
          title={s.title}
          subtitle={`${s.week_number ? `Semana ${s.week_number} · ` : ''}${formatShortDate(s.created_at)} · ${s.sent ? (s.read_at ? 'leído' : 'enviado, sin leer') : 'borrador'}`}
          onPress={() => router.push(`/admin/resumen/${child.id}?id=${s.id}`)}
        />
      ))}

      <SectionTitle icon="calendar-heart">Citas</SectionTitle>
      {appts.length === 0 ? <Txt variant="small">Sin citas.</Txt> : null}
      {appts.map((a) => (
        <AppointmentCard key={a.id} appt={a} />
      ))}

      <SectionTitle icon="clipboard-list-outline">Añadir tarea para {child.name}</SectionTitle>
      <Card>
        <Input value={taskTitle} onChangeText={setTaskTitle} placeholder="Ej.: revisar siestas en la guardería" />
        <Button small title="Añadir tarea" icon="plus" onPress={addTask} disabled={!taskTitle.trim()} style={{ alignSelf: 'flex-start' }} />
        <DoneManualTasks childId={child.id} onOpen={setEditTask} />
      </Card>
      <ManualTaskEditor taskId={editTask} onClose={() => setEditTask(null)} />
    </Screen>
  );
}
