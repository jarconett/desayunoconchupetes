// Configuración del servicio (ajústala a tu disponibilidad)

/** Días con citas: 1 = lunes … 6 = sábado, 0 = domingo */
export const WORK_DAYS = [1, 2, 3, 4, 5];

/** Franjas horarias disponibles para citas (hora local) */
export const SLOT_START = '09:30';
export const SLOT_END = '20:00';
export const SLOT_STEP_MIN = 45;

/** Antelación mínima para solicitar una cita (horas) */
export const MIN_NOTICE_HOURS = 24;

export const APPOINTMENT_LABEL = {
  entrevista_inicial: 'Entrevista inicial',
  evaluacion_semanal: 'Evaluación semanal',
} as const;

export const APPOINTMENT_STATUS = {
  solicitada: { label: 'Pendiente de confirmar', color: '#FFF2C7', text: '#8A6A12' },
  confirmada: { label: 'Confirmada', color: '#DDF1E6', text: '#3E7D5C' },
  realizada: { label: 'Realizada', color: '#DCE2F2', text: '#3D4A70' },
  cancelada: { label: 'Cancelada', color: '#ECE6DE', text: '#6E6E78' },
  rechazada: { label: 'No disponible', color: '#F8DDE4', text: '#A24A63' },
} as const;

export const SUBSCRIPTION_STATUS = {
  sin_suscripcion: { label: 'Sin suscripción', color: '#ECE6DE', text: '#6E6E78' },
  activa: { label: 'Activa', color: '#DDF1E6', text: '#3E7D5C' },
  pausada: { label: 'Pausada', color: '#FFF2C7', text: '#8A6A12' },
  finalizada: { label: 'Finalizada', color: '#DCE2F2', text: '#3D4A70' },
  cancelada: { label: 'Cancelada', color: '#F8DDE4', text: '#A24A63' },
} as const;

export const CHILD_STATUS = {
  entrevista: { label: 'Entrevista inicial', color: '#FFF2C7', text: '#8A6A12' },
  intervencion: { label: 'En intervención', color: '#DDEFF0', text: '#2F7480' },
  finalizada: { label: 'Intervención finalizada', color: '#E8E1F5', text: '#6A5A99' },
} as const;

export const MODALITY_LABEL = {
  videollamada: 'Videollamada',
  llamada: 'Llamada',
  presencial: 'Presencial',
} as const;
