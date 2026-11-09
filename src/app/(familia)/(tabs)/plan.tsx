import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { PlanSections, ReminderSummary, Timeline } from '@/components/plan';
import { WeekIndicator } from '@/components/progress';
import { Button, Card, Chips, Empty, HeroHeader, Row, Screen, SectionTitle, Toggle, Txt } from '@/components/ui';
import { useFamily } from '@/context/family';
import { formatDate, formatShortDate } from '@/lib/dates';
import { getRemindersEnabled, remindersSupported, setRemindersEnabled, syncPlanReminders } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { SleepPlanVersion } from '@/lib/types';

export default function Plan() {
  const fam = useFamily();
  const withPlan = fam.children.filter((c) => fam.plans.some((p) => p.child_id === c.id && p.published));
  const [childId, setChildId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [versions, setVersions] = useState<SleepPlanVersion[]>([]);

  const child = withPlan.find((c) => c.id === childId) ?? withPlan[0];
  const plan = child ? fam.plans.find((p) => p.child_id === child.id) : undefined;

  useEffect(() => {
    getRemindersEnabled().then(setEnabled);
  }, []);

  useEffect(() => {
    if (!child) return;
    supabase
      .from('sleep_plan_versions')
      .select('*')
      .eq('child_id', child.id)
      .order('version', { ascending: false })
      .then(({ data }) => setVersions((data as SleepPlanVersion[]) ?? []));
  }, [child, plan?.version]);

  const toggleReminders = async (v: boolean) => {
    setEnabled(v);
    await setRemindersEnabled(v);
    await syncPlanReminders(
      fam.plans
        .filter((p) => p.published)
        .map((p) => ({ childId: p.child_id, childName: fam.children.find((c) => c.id === p.child_id)?.name ?? '', reminders: p.reminders })),
    );
  };

  return (
    <Screen header={<HeroHeader title="Plan de sueño" subtitle={child && plan ? `${child.name} · actualizado el ${formatShortDate(plan.updated_at)}` : 'Tu guía personalizada'} />}>
      {!plan || !child ? (
        <Empty
          icon="weather-night"
          title="Tu plan está en camino"
          text="Cuando completéis el primer diario de sueño, la asesora preparará el plan personalizado y te avisaremos."
        />
      ) : (
        <>
          {withPlan.length > 1 ? (
            <View style={{ marginBottom: 10 }}>
              <Chips options={withPlan.map((c) => ({ value: c.id, label: c.name }))} value={child.id} onChange={setChildId} />
            </View>
          ) : null}

          <Card>
            <WeekIndicator child={child} />
          </Card>

          <Row gap={8} style={{ marginTop: 12, flexWrap: 'wrap' }}>
            <Button title="Temporizador de siesta" icon="timer-outline" variant="secondary" small style={{ flexGrow: 1 }} onPress={() => router.push('/temporizador')} />
            <Button title="Ruido blanco" icon="waves" variant="secondary" small style={{ flexGrow: 1 }} onPress={() => router.push('/ruido-blanco')} />
          </Row>

          <SectionTitle icon="bell-ring-outline">Recordatorios</SectionTitle>
          <ReminderSummary reminders={plan.reminders} />
          <Card style={{ marginTop: 10 }}>
            {remindersSupported ? (
              <>
                <Toggle value={enabled} onChange={toggleReminders} label="Recibir recordatorios en este móvil" />
                <Txt variant="small" style={{ marginTop: 6 }}>
                  {plan.reminders.advance_min ? `Te avisaremos ${plan.reminders.advance_min} minutos antes. ` : ''}
                  Los recordatorios se actualizan solos cada vez que la asesora ajusta el plan.
                </Txt>
              </>
            ) : (
              <Txt variant="small">
                Los recordatorios se reciben en la app del móvil (Android o iPhone). Descárgala e inicia sesión con tu cuenta para activarlos.
              </Txt>
            )}
          </Card>

          <SectionTitle icon="clock-outline">Horario del día</SectionTitle>
          <Card>
            <Timeline content={plan.content} reminders={plan.reminders} highlightNow />
          </Card>

          <PlanSections content={plan.content} />

          {versions.length > 1 ? (
            <>
              <SectionTitle icon="history">Ajustes del plan</SectionTitle>
              {versions.map((v) => (
                <Card key={v.id} style={{ marginBottom: 8, padding: 12 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt variant="h3">
                      Versión {v.version}
                      {v.week_number ? ` · semana ${v.week_number}` : ''}
                    </Txt>
                    <Txt variant="small">{formatDate(v.created_at)}</Txt>
                  </Row>
                  {v.change_note ? (
                    <Txt variant="small" color={colors.text} style={{ marginTop: 4 }}>
                      {v.change_note}
                    </Txt>
                  ) : null}
                </Card>
              ))}
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
