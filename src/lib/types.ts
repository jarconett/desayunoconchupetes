export type Role = 'admin' | 'familia';

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  email: string | null;
  phone: string | null;
  push_token: string | null;
  created_at: string;
}

export type SubscriptionStatus = 'sin_suscripcion' | 'activa' | 'pausada' | 'finalizada' | 'cancelada';

export interface Subscription {
  family_id: string;
  status: SubscriptionStatus;
  plan_name: string;
  start_date: string | null;
  end_date: string | null;
  price: number | null;
  paid: boolean;
  notes: string | null;
  updated_at: string;
}

export type ChildStatus = 'entrevista' | 'intervencion' | 'finalizada';
export type PathologyRange = '4-7' | '8-12' | '12-24';

export interface Child {
  id: string;
  family_id: string;
  name: string;
  sex: 'niño' | 'niña' | 'otro' | null;
  birth_date: string | null;
  parents_names: string | null;
  status: ChildStatus;
  intervention_start: string | null;
  intervention_weeks: number;
  pathology_range: PathologyRange | null;
  created_at: string;
}

export type AppointmentKind = 'entrevista_inicial' | 'evaluacion_semanal';
export type AppointmentStatus = 'solicitada' | 'confirmada' | 'realizada' | 'cancelada' | 'rechazada';

export interface Appointment {
  id: string;
  family_id: string;
  child_id: string | null;
  kind: AppointmentKind;
  week_number: number | null;
  starts_at: string;
  duration_min: number;
  modality: 'videollamada' | 'llamada' | 'presencial';
  status: AppointmentStatus;
  family_notes: string | null;
  admin_notes: string | null;
  meeting_link: string | null;
  created_at: string;
}

export interface InterventionRequest {
  id: string;
  child_id: string;
  family_id: string;
  status: 'pendiente' | 'aceptada' | 'rechazada';
  message: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface SleepSheet {
  child_id: string;
  data: Record<string, string>;
  updated_at: string;
}

export type YesNo = 'si' | 'no' | '';

export interface PathologyHistory {
  child_id: string;
  age_range: PathologyRange;
  answers: Record<string, { value?: YesNo; text?: string; comment?: string }>;
  submitted: boolean;
  submitted_at: string | null;
  updated_at: string;
}

export type DiaryState = 'despierto' | 'siesta' | 'rutina' | 'dormido' | 'despertar' | 'llanto';

export interface SleepDiary {
  id: string;
  child_id: string;
  week_number: number;
  week_start: string | null;
  /** día (0=lunes..6=domingo) -> hora (0..23) -> estado */
  entries: Record<string, Record<string, DiaryState>>;
  day_notes: Record<string, string>;
  notes: string | null;
  submitted: boolean;
  submitted_at: string | null;
  updated_at: string;
}

export type ReminderKey = 'nap_start' | 'nap_end' | 'routine_start' | 'bedtime';

export interface ReminderConfig {
  enabled: boolean;
  time: string; // HH:MM
}

export interface PlanReminders {
  nap_start?: ReminderConfig;
  nap_end?: ReminderConfig;
  routine_start?: ReminderConfig;
  bedtime?: ReminderConfig;
  advance_min?: number;
}

export interface ScheduleItem {
  time: string;
  label: string;
}

export interface PlanContent {
  evaluacion?: string;
  objetivos?: string;
  intervencion?: string;
  siestas?: string;
  noches?: string;
  despertares?: string;
  mejorar?: string;
  consideraciones?: string;
  schedule?: ScheduleItem[];
}

export interface SleepPlan {
  child_id: string;
  content: PlanContent;
  reminders: PlanReminders;
  published: boolean;
  version: number;
  updated_at: string;
}

export interface SleepPlanVersion {
  id: string;
  child_id: string;
  version: number;
  week_number: number | null;
  change_note: string | null;
  content: PlanContent;
  reminders: PlanReminders;
  created_at: string;
}

export interface SessionSummary {
  id: string;
  child_id: string;
  appointment_id: string | null;
  week_number: number | null;
  title: string;
  content: string;
  sent: boolean;
  read_at: string | null;
  created_at: string;
}

export interface AdminTask {
  id: string;
  child_id: string | null;
  title: string;
  due_date: string | null;
  done: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}
