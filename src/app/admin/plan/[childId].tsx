import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { PlanSections, ReminderSummary, Timeline } from '@/components/plan';
import { TimeInput } from '@/components/pickers';
import { WeekIndicator } from '@/components/progress';
import { Badge, Button, Card, Chips, Empty, HeroHeader, Icon, IconBubble, Input, Loading, Row, Screen, SectionTitle, Toggle, Txt, confirmAction, notify } from '@/components/ui';
import { useAdmin } from '@/context/admin';
import { PLAN_SECTIONS, REMINDERS } from '@/lib/forms';
import { ageLabel, formatShortDate, interventionWeek } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/lib/theme';
import type { Child, PlanContent, PlanReminders, SleepPlan } from '@/lib/types';

function template(child: Child): PlanContent {
  return {
    evaluacion: `Nombre: ${child.name}\nEdad: ${ageLabel(child.birth_date)}\n\nDespués de revisar los diferentes documentos que os pedimos rellenar podemos observar:\n- \n\nDel diario de sueño podemos observar:\n- `,
    objetivos: `- Que ${child.name} gestione sus despertares de la manera más independiente posible respecto a su edad\n- Regular su horario de siestas\n- Que consiga dormir las horas promedio para su edad\n\nLos cambios se harán siguiendo un plan de intervención, instaurándolos de forma gradual y revisándolos cada semana para ir ajustando.`,
    intervencion: 'Durante las dos primeras semanas nos vamos a centrar en:\n- Establecer HORARIOS de siestas y de dormir\n- Establecer RUTINAS',
    siestas: 'Horario que os propongo para la siesta:\n- \n\n¿Cómo lo hacemos?\n- Nos adelantamos media hora y preparamos el ambiente (luz natural, sonidos suaves…)\n- Verbalizamos su estado de cansancio',
    noches: '- 19:00: comenzáis la rutina\n- 20:00: cena (no copiosa, sin chocolate ni azúcar)\n- Aplicar 1,2,3 DESCANSO: iluminación, ruido, ventilar 5 minutos antes, temperatura…\n- 20:30: a la habitación con luz tenue',
    despertares: '- Identificar verdaderos despertares: esperad 1-2 minutos antes de entrar (NO si está llorando desconsolado)',
    mejorar: '',
    consideraciones:
      'La constancia, calma y comprensión de cómo funciona su sueño durante todo el proceso es fundamental. La prisa por lograr cambios inmediatos y la inseguridad pueden entorpecerlo.\n\nSe puede ser flexible si la situación lo requiere, pero es fundamental no cambiar de estrategia y horarios cada noche.\n\nEs normal pasar por altibajos. Estaré siguiendo el proceso y ayudándoos.',
    schedule: [{ time: '20:00', label: 'Cena' }],
  };
}

const defaultReminders: PlanReminders = {
  nap_start: { enabled: true, time: '13:00' },
  nap_end: { enabled: true, time: '15:00' },
  routine_start: { enabled: true, time: '19:00' },
  bedtime: { enabled: true, time: '20:30' },
  advance_min: 0,
};

export default function PlanEditor() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const adm = useAdmin();
  const child = adm.children.find((c) => c.id === childId);
  const [plan, setPlan] = useState<SleepPlan | null>(null);
  const [content, setContent] = useState<PlanContent>({});
  const [reminders, setReminders] = useState<PlanReminders>(defaultReminders);
  const [loaded, setLoaded] = useState(false);
  const [preview, setPreview] = useState(false);
  const [changeNote, setChangeNote] = useState('');

  useEffect(() => {
    if (!childId || !child) return;
    supabase
      .from('sleep_plans')
      .select('*')
      .eq('child_id', childId)
      .maybeSingle()
      .then(({ data }) => {
        const p = data as SleepPlan | null;
        setPlan(p);
        setContent(p?.content && Object.keys(p.content).length ? p.content : template(child));
        setReminders({ ...defaultReminders, ...(p?.reminders ?? {}) });
        setLoaded(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, !!child]);

  if (adm.loading) return <Loading />;
  if (!child) return <Screen header={<HeroHeader back title="Plan de sueño" />}><Empty title="No encontrado" /></Screen>;
  if (!loaded) return <Loading />;

  const week = interventionWeek(child);
  const lastDiary = adm.diaries.filter((d) => d.child_id === child.id && d.submitted).at(-1);

  const persist = async (publish: boolean) => {
    const wasPublished = !!plan?.published;
    if (publish && wasPublished && !changeNote.trim()) {
      const ok = await confirmAction('Publicar cambios', 'No has escrito qué cambia en esta versión. ¿Publicar igualmente?', 'Publicar');
      if (!ok) return;
    }
    const version = publish && wasPublished ? (plan?.version ?? 1) + 1 : plan?.version ?? 1;
    const now = new Date().toISOString();
    const row = {
      child_id: child.id,
      content,
      reminders,
      published: publish || wasPublished,
      version,
      updated_at: now,
    };
    const { error } = await supabase.from('sleep_plans').upsert(row);
    if (error) return notify('Error', error.message);
    if (publish) {
      await supabase.from('sleep_plan_versions').insert({
        child_id: child.id,
        version,
        week_number: week || null,
        change_note: changeNote.trim() || (wasPublished ? null : 'Plan inicial'),
        content,
        reminders,
      });
    }
    setPlan(row as SleepPlan);
    setChangeNote('');
    adm.reload();
    notify(
      publish ? (wasPublished ? 'Cambios publicados' : '¡Plan publicado!') : 'Borrador guardado',
      publish ? 'La familia recibirá un aviso y sus recordatorios se ajustarán automáticamente.' : undefined,
    );
  };

  const setReminder = (key: keyof Omit<PlanReminders, 'advance_min'>, patch: Partial<{ enabled: boolean; time: string }>) => {
    const cur = reminders[key] ?? { enabled: true, time: '20:00' };
    setReminders({ ...reminders, [key]: { ...cur, ...patch } });
  };

  const schedule = content.schedule ?? [];

  return (
    <Screen
      header={
        <HeroHeader
          back
          title="Plan de sueño"
          subtitle={`${child.name} · ${plan ? `${plan.published ? 'publicado' : 'borrador'} · v${plan.version}` : 'nuevo'}`}
          right={<Button small variant="secondary" icon={preview ? 'pencil-outline' : 'eye-outline'} title={preview ? 'Editar' : 'Vista familia'} onPress={() => setPreview(!preview)} />}
        />
      }>
      <Card>
        <WeekIndicator child={child} />
        {lastDiary ? (
          <Button
            small
            variant="soft"
            icon="notebook-heart-outline"
            title={`Ver diario semana ${lastDiary.week_number}`}
            style={{ alignSelf: 'flex-start', marginTop: 12 }}
            onPress={() => router.push(`/admin/diario/${lastDiary.id}`)}
          />
        ) : (
          <Txt variant="small" style={{ marginTop: 8 }}>
            Todavía no hay diarios enviados.
          </Txt>
        )}
      </Card>

      {preview ? (
        <>
          <SectionTitle icon="bell-ring-outline">Recordatorios</SectionTitle>
          <ReminderSummary reminders={reminders} />
          <SectionTitle icon="clock-outline">Horario del día</SectionTitle>
          <Card>
            <Timeline content={content} reminders={reminders} />
          </Card>
          <PlanSections content={content} />
        </>
      ) : (
        <>
          <SectionTitle icon="bell-ring-outline">Recordatorios para la familia</SectionTitle>
          <Txt variant="small" style={{ marginBottom: 10 }}>
            Se envían como notificación en el móvil de la familia cada día a la hora indicada. Al publicar cambios, los recordatorios se ajustan solos.
          </Txt>
          {REMINDERS.map((r) => {
            const cfg = reminders[r.key] ?? { enabled: false, time: '20:00' };
            return (
              <Card key={r.key} style={{ marginBottom: 8, padding: 12 }}>
                <Row style={{ flexWrap: 'wrap' }}>
                  <IconBubble name={r.icon} bg={r.color} color={colors.night} size={40} />
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Txt variant="h3">{r.label}</Txt>
                    <Txt variant="small">{r.message}</Txt>
                  </View>
                  <TimeInput value={cfg.time} onChange={(t) => setReminder(r.key, { time: t })} />
                  <Toggle value={cfg.enabled} onChange={(v) => setReminder(r.key, { enabled: v })} />
                </Row>
              </Card>
            );
          })}
          <Txt variant="label" style={{ marginTop: 6 }}>
            Avisar con antelación
          </Txt>
          <Chips
            options={[0, 5, 10, 15, 30].map((m) => ({ value: m, label: m ? `${m} min antes` : 'A la hora exacta' }))}
            value={reminders.advance_min ?? 0}
            onChange={(m) => setReminders({ ...reminders, advance_min: m })}
          />

          <SectionTitle icon="clock-outline" action={<Button small variant="ghost" icon="plus" title="Añadir" onPress={() => setContent({ ...content, schedule: [...schedule, { time: '12:00', label: '' }] })} />}>
            Otros momentos del día
          </SectionTitle>
          <Txt variant="small" style={{ marginBottom: 8 }}>
            Aparecen en el horario diario de la familia (sin notificación). Ej.: comida, cena, baño, rutina pre-siesta…
          </Txt>
          {schedule.map((s, i) => (
            <Row key={i} style={{ marginBottom: 8 }}>
              <TimeInput
                value={s.time}
                onChange={(t) => setContent({ ...content, schedule: schedule.map((x, j) => (j === i ? { ...x, time: t } : x)) })}
              />
              <TextInput
                value={s.label}
                placeholder="Qué ocurre"
                placeholderTextColor="#B0AEB8"
                onChangeText={(t) => setContent({ ...content, schedule: schedule.map((x, j) => (j === i ? { ...x, label: t } : x)) })}
                style={{
                  flex: 1,
                  backgroundColor: '#fff',
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  borderRadius: radius.sm,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontFamily: fonts.medium,
                  color: colors.text,
                }}
              />
              <Pressable accessibilityLabel="Eliminar" onPress={() => setContent({ ...content, schedule: schedule.filter((_, j) => j !== i) })} hitSlop={8}>
                <Icon name="trash-can-outline" color={colors.danger} />
              </Pressable>
            </Row>
          ))}

          <SectionTitle icon="text-box-edit-outline">Contenido del plan</SectionTitle>
          <Txt variant="small" style={{ marginBottom: 10 }}>
            Consejo: empieza una línea con “- ” para crear una lista, o escribe un título en MAYÚSCULAS.
          </Txt>
          {PLAN_SECTIONS.map((s) => (
            <Card key={s.key} style={{ marginBottom: 10 }}>
              <Row style={{ marginBottom: 6 }}>
                <Icon name={s.icon} color={colors.primary} size={20} />
                <Txt variant="h3">{s.title}</Txt>
              </Row>
              <Input
                value={content[s.key] ?? ''}
                onChangeText={(t) => setContent({ ...content, [s.key]: t })}
                multiline
                placeholder={s.hint}
                style={{ minHeight: 120 }}
              />
            </Card>
          ))}
        </>
      )}

      <SectionTitle icon="send-outline">Publicar</SectionTitle>
      <Card tint={colors.primarySoft}>
        {plan?.published ? (
          <>
            <Row style={{ marginBottom: 8 }}>
              <Badge label={`Versión actual: ${plan.version}`} />
              <Txt variant="small">Publicado el {formatShortDate(plan.updated_at)}</Txt>
            </Row>
            <Input
              label={`¿Qué cambia en esta versión?${week ? ` (semana ${week})` : ''}`}
              value={changeNote}
              onChangeText={setChangeNote}
              placeholder="Ej.: adelantamos la siesta 15 minutos"
              multiline
            />
          </>
        ) : (
          <Txt style={{ marginBottom: 10 }}>Cuando publiques el plan, la familia lo verá en su app y se activarán sus recordatorios.</Txt>
        )}
        <Row style={{ flexWrap: 'wrap' }}>
          <Button title={plan?.published ? 'Publicar cambios' : 'Publicar plan'} icon="send" onPress={() => persist(true)} />
          {!plan?.published ? <Button title="Guardar borrador" variant="secondary" icon="content-save-outline" onPress={() => persist(false)} /> : null}
        </Row>
      </Card>
    </Screen>
  );
}
