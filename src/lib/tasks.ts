import { PATHOLOGY_RANGE_LABEL, DESCANSO_DOC_KEY } from './forms';
import { interventionWeek, pathologyRangeFor } from './dates';
import type {
  AdminTask,
  Appointment,
  Child,
  InterventionRequest,
  PathologyHistory,
  SessionSummary,
  SleepDiary,
  SleepPlan,
  SleepSheet,
  Subscription,
} from './types';

export interface PendingTask {
  id: string;
  title: string;
  detail?: string;
  icon: string;
  link: string;
  priority: number; // menor = más importante
  childName?: string;
  childId?: string;
}

interface FamilyInput {
  children: Child[];
  appointments: Appointment[];
  requests: InterventionRequest[];
  pathologies: PathologyHistory[];
  diaries: SleepDiary[];
  plans: SleepPlan[];
  summaries: SessionSummary[];
  reads: string[];
}

/** Tareas pendientes de la familia (banner de "Tareas pendientes"). */
export function computeFamilyTasks(d: FamilyInput, subscriptionActive: boolean): PendingTask[] {
  const tasks: PendingTask[] = [];
  const active = (a: Appointment) => a.status === 'solicitada' || a.status === 'confirmada' || a.status === 'realizada';

  if (d.children.length === 0) {
    tasks.push({
      id: 'add-child',
      title: 'Añade los datos de tu peque',
      detail: 'Es el primer paso para solicitar la entrevista inicial',
      icon: 'baby-face-outline',
      link: '/peque/nuevo',
      priority: 0,
    });
    return tasks;
  }

  let descansoNeeded = false;

  for (const c of d.children) {
    const appts = d.appointments.filter((a) => a.child_id === c.id);
    if (c.status === 'entrevista') {
      const interview = appts.find((a) => a.kind === 'entrevista_inicial' && active(a));
      if (!interview) {
        tasks.push({
          id: `interview-${c.id}`,
          title: 'Solicita la entrevista inicial',
          detail: 'Elige el día y la hora que mejor os venga',
          icon: 'calendar-heart',
          link: '/citas',
          priority: 1,
          childName: c.name,
          childId: c.id,
        });
      } else if (interview.status !== 'solicitada') {
        const req = d.requests.find((r) => r.child_id === c.id && r.status !== 'rechazada');
        if (!req) {
          tasks.push({
            id: `request-${c.id}`,
            title: '¿Comenzamos la intervención?',
            detail: 'Solicita la intervención de 6 semanas desde Mi espacio',
            icon: 'star-shooting-outline',
            link: '/mi-espacio',
            priority: 2,
            childName: c.name,
            childId: c.id,
          });
        }
      }
      continue;
    }
    if (c.status !== 'intervencion') continue;
    if (!subscriptionActive) continue;

    descansoNeeded = true;
    const week = interventionWeek(c);
    const range = pathologyRangeFor(c);
    const ph = d.pathologies.find((p) => p.child_id === c.id);
    if (!ph?.submitted) {
      tasks.push({
        id: `pathology-${c.id}`,
        title: 'Completa el histórico de patologías',
        detail: `Documento de ${PATHOLOGY_RANGE_LABEL[range]}`,
        icon: 'stethoscope',
        link: `/historico/${c.id}`,
        priority: 2,
        childName: c.name,
        childId: c.id,
      });
    }
    if (week >= 1) {
      const diary = d.diaries.find((x) => x.child_id === c.id && x.week_number === week);
      if (!diary?.submitted) {
        tasks.push({
          id: `diary-${c.id}-${week}`,
          title: `Diario de sueño · semana ${week}`,
          detail: diary ? 'Lo tienes empezado: complétalo y envíalo' : 'Registra cada día qué ocurre hora a hora',
          icon: 'notebook-heart-outline',
          link: `/diario/${c.id}/${week}`,
          priority: 3,
          childName: c.name,
          childId: c.id,
        });
      }
      const hasEval = appts.some((a) => a.kind === 'evaluacion_semanal' && a.week_number === week && active(a));
      if (!hasEval) {
        tasks.push({
          id: `eval-${c.id}-${week}`,
          title: `Agenda la evaluación de la semana ${week}`,
          detail: 'Revisaremos juntas cómo va la semana',
          icon: 'calendar-clock',
          link: '/citas',
          priority: 4,
          childName: c.name,
          childId: c.id,
        });
      }
    }
    for (const s of d.summaries.filter((x) => x.child_id === c.id && !x.read_at)) {
      tasks.push({
        id: `summary-${s.id}`,
        title: 'Lee el resumen de la sesión',
        detail: s.title,
        icon: 'email-heart-outline',
        link: `/resumen/${s.id}`,
        priority: 5,
        childName: c.name,
        childId: c.id,
      });
    }
  }

  if (descansoNeeded && !d.reads.includes(DESCANSO_DOC_KEY)) {
    tasks.push({
      id: 'descanso',
      title: 'Lee el documento 1,2,3 DESCANSO',
      detail: 'Ambiente, siestas y rutinas: la base de todo',
      icon: 'book-open-page-variant-outline',
      link: '/descanso',
      priority: 1,
    });
  }

  return tasks.sort((a, b) => a.priority - b.priority);
}

export interface AdminInput {
  children: Child[];
  appointments: Appointment[];
  requests: InterventionRequest[];
  sheets: Pick<SleepSheet, 'child_id'>[];
  diaries: Pick<SleepDiary, 'id' | 'child_id' | 'week_number' | 'submitted' | 'submitted_at'>[];
  plans: Pick<SleepPlan, 'child_id' | 'published' | 'updated_at'>[];
  summaries: Pick<SessionSummary, 'appointment_id' | 'child_id'>[];
  subscriptions: Pick<Subscription, 'family_id' | 'status'>[];
  manual: AdminTask[];
  familyNames: Record<string, string>;
}

/** Tareas pendientes de la administradora (automáticas + manuales). */
export function computeAdminTasks(d: AdminInput): PendingTask[] {
  const tasks: PendingTask[] = [];
  const now = Date.now();
  const childById = Object.fromEntries(d.children.map((c) => [c.id, c]));

  for (const a of d.appointments) {
    const c = a.child_id ? childById[a.child_id] : undefined;
    const who = c?.name ?? d.familyNames[a.family_id] ?? 'Familia';
    if (a.status === 'solicitada') {
      tasks.push({
        id: `confirm-${a.id}`,
        title: 'Confirmar solicitud de cita',
        detail: a.kind === 'entrevista_inicial' ? 'Entrevista inicial' : `Evaluación semana ${a.week_number ?? ''}`,
        icon: 'calendar-question',
        link: '/admin/agenda',
        priority: 0,
        childName: who,
        childId: c?.id,
      });
    } else if (a.status === 'confirmada' && new Date(a.starts_at).getTime() + a.duration_min * 60000 < now) {
      tasks.push({
        id: `done-${a.id}`,
        title: 'Marcar cita como realizada',
        detail: a.kind === 'entrevista_inicial' ? 'Entrevista inicial' : `Evaluación semana ${a.week_number ?? ''}`,
        icon: 'calendar-check',
        link: '/admin/agenda',
        priority: 2,
        childName: who,
        childId: c?.id,
      });
    } else if (
      a.status === 'realizada' &&
      a.kind === 'evaluacion_semanal' &&
      c &&
      !d.summaries.some((s) => s.appointment_id === a.id)
    ) {
      tasks.push({
        id: `summary-${a.id}`,
        title: 'Escribir y enviar resumen de la sesión',
        detail: `Evaluación semana ${a.week_number ?? ''}`,
        icon: 'email-edit-outline',
        link: `/admin/resumen/${c.id}?cita=${a.id}`,
        priority: 1,
        childName: who,
        childId: c.id,
      });
    }
  }

  for (const r of d.requests.filter((x) => x.status === 'pendiente')) {
    const c = childById[r.child_id];
    tasks.push({
      id: `req-${r.id}`,
      title: 'Revisar solicitud de intervención',
      icon: 'star-shooting-outline',
      link: `/admin/nino/${r.child_id}`,
      priority: 0,
      childName: c?.name,
      childId: r.child_id,
    });
  }

  for (const c of d.children) {
    const interviewDone = d.appointments.some(
      (a) => a.child_id === c.id && a.kind === 'entrevista_inicial' && (a.status === 'realizada' || a.status === 'confirmada'),
    );
    if (interviewDone && !d.sheets.some((s) => s.child_id === c.id)) {
      tasks.push({
        id: `sheet-${c.id}`,
        title: 'Completar ficha de sueño',
        icon: 'clipboard-edit-outline',
        link: `/admin/ficha/${c.id}`,
        priority: 2,
        childName: c.name,
        childId: c.id,
      });
    }
    if (c.status !== 'intervencion') continue;
    const sub = d.subscriptions.find((s) => s.family_id === c.family_id);
    if (sub?.status !== 'activa') {
      tasks.push({
        id: `sub-${c.id}`,
        title: 'Activar suscripción de la familia',
        detail: 'Sin suscripción activa no pueden completar los documentos',
        icon: 'card-account-details-star-outline',
        link: `/admin/familia/${c.family_id}`,
        priority: 1,
        childName: c.name,
        childId: c.id,
      });
    }
    const plan = d.plans.find((p) => p.child_id === c.id);
    const childDiaries = d.diaries.filter((x) => x.child_id === c.id && x.submitted);
    if (childDiaries.length > 0 && !plan?.published) {
      tasks.push({
        id: `plan-${c.id}`,
        title: 'Preparar el plan de sueño',
        detail: 'Ya está el primer diario de sueño',
        icon: 'file-document-edit-outline',
        link: `/admin/plan/${c.id}`,
        priority: 1,
        childName: c.name,
        childId: c.id,
      });
    } else if (plan?.published) {
      const newer = childDiaries.filter((x) => x.submitted_at && x.submitted_at > plan.updated_at);
      for (const x of newer) {
        tasks.push({
          id: `review-${c.id}-${x.week_number}`,
          title: `Revisar diario semana ${x.week_number} y ajustar plan`,
          icon: 'chart-timeline-variant',
          link: `/admin/diario/${x.id}`,
          priority: 3,
          childName: c.name,
          childId: c.id,
        });
      }
    }
  }

  for (const t of d.manual.filter((x) => !x.done)) {
    const c = t.child_id ? childById[t.child_id] : undefined;
    tasks.push({
      id: `manual-${t.id}`,
      title: t.title,
      detail: t.due_date ? `Para el ${t.due_date.split('-').reverse().join('/')}` : undefined,
      icon: 'checkbox-blank-circle-outline',
      link: c ? `/admin/nino/${c.id}` : '/admin/agenda',
      priority: 4,
      childName: c?.name,
      childId: c?.id,
    });
  }

  return tasks.sort((a, b) => a.priority - b.priority);
}
