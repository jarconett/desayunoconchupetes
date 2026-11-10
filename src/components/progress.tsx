import { router } from 'expo-router';
import { View } from 'react-native';

import { formatShortDate, interventionWeek } from '@/lib/dates';
import type { PendingTask } from '@/lib/tasks';
import { colors, radius } from '@/lib/theme';
import type { Child } from '@/lib/types';

import { Card, Icon, IconBubble, Row, Txt } from './ui';

/** Indicador de la semana de intervención: 6 lunitas que se van "llenando". */
export function WeekIndicator({ child, compact }: { child: Child; compact?: boolean }) {
  const week = interventionWeek(child);
  const total = child.intervention_weeks;
  let label: string;
  if (child.status === 'entrevista') label = 'Fase de entrevista inicial';
  else if (child.status === 'finalizada') label = 'Intervención finalizada 🎉';
  else if (week === 0) label = child.intervention_start ? `Comienza el ${formatShortDate(child.intervention_start)}` : 'Pendiente de inicio';
  else label = `Semana ${week} de ${total}`;

  return (
    <View>
      {!compact ? (
        <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <Txt variant="caption">Intervención</Txt>
          <Txt variant="label" color={colors.primaryDark} style={{ marginBottom: 0 }}>
            {label}
          </Txt>
        </Row>
      ) : null}
      <Row gap={6}>
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const done = child.status === 'finalizada' || n < week;
          const current = child.status === 'intervencion' && n === week;
          return (
            <View
              key={n}
              accessibilityLabel={`Semana ${n}${current ? ', actual' : done ? ', completada' : ''}`}
              style={{
                flex: 1,
                height: compact ? 8 : 30,
                borderRadius: radius.pill,
                backgroundColor: done ? colors.primary : current ? colors.lavender : colors.border,
                borderWidth: current ? 2 : 0,
                borderColor: colors.lavenderDark,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {!compact ? (
                current ? (
                  <Icon name="moon-waning-crescent" size={15} color={colors.lavenderDark} />
                ) : (
                  <Txt variant="caption" color={done ? '#fff' : colors.muted}>
                    {n}
                  </Txt>
                )
              ) : null}
            </View>
          );
        })}
      </Row>
      {compact ? (
        <Txt variant="small" style={{ marginTop: 4 }}>
          {label}
        </Txt>
      ) : null}
    </View>
  );
}

/** Banner de tareas pendientes. */
export function PendingBanner({
  tasks,
  max = 6,
  title = 'Tareas pendientes',
  here,
  onManualTask,
}: {
  tasks: PendingTask[];
  max?: number;
  title?: string;
  /** Ruta de la pantalla actual: las tareas que llevan aquí no navegan (evita abrir la misma pantalla en bucle) */
  here?: string;
  /** Al pulsar una tarea añadida a mano (para marcarla, editarla o eliminarla) */
  onManualTask?: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return (
      <Card tint={colors.mint}>
        <Row>
          <IconBubble name="check-circle-outline" bg="#fff" color={colors.mintDark} />
          <View style={{ flex: 1 }}>
            <Txt variant="h3">¡Todo al día!</Txt>
            <Txt variant="small">No tienes tareas pendientes. Dulces sueños 🌙</Txt>
          </View>
        </Row>
      </Card>
    );
  }
  return (
    <Card tint={colors.butter} style={{ padding: 14 }}>
      <Row style={{ marginBottom: 10 }}>
        <Icon name="bell-ring-outline" color={colors.butterDark} />
        <Txt variant="h3" style={{ flex: 1 }}>
          {title}
        </Txt>
        <View style={{ backgroundColor: colors.butterDark, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 2 }}>
          <Txt variant="label" color="#fff" style={{ marginBottom: 0 }}>
            {tasks.length}
          </Txt>
        </View>
      </Row>
      {tasks.slice(0, max).map((t) => {
        const manual = !!t.manualId && !!onManualTask;
        const isHere = !manual && !!here && t.link.split('?')[0] === here;
        const onPress = manual ? () => onManualTask!(t.manualId!) : isHere ? undefined : () => router.push(t.link as never);
        return (
        <Card key={t.id} onPress={onPress} style={{ marginBottom: 8, padding: 12 }}>
          <Row>
            <IconBubble name={t.icon} size={38} bg={colors.bg} color={colors.primaryDark} />
            <View style={{ flex: 1 }}>
              <Txt variant="h3" style={{ fontSize: 15 }}>
                {t.title}
              </Txt>
              <Txt variant="small" numberOfLines={2}>
                {[t.childName, t.detail].filter(Boolean).join(' · ')}
              </Txt>
            </View>
            {manual ? <Icon name="dots-horizontal" color={colors.muted} /> : onPress ? <Icon name="chevron-right" color={colors.muted} /> : null}
          </Row>
        </Card>
        );
      })}
      {tasks.length > max ? (
        <Txt variant="small" center>
          y {tasks.length - max} más…
        </Txt>
      ) : null}
    </Card>
  );
}
