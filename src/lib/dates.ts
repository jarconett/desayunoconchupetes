import type { Child, PathologyRange } from './types';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' en hora local */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parsea 'YYYY-MM-DD' como fecha local (no UTC). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(s: string | Date | null | undefined, withWeekday = false): string {
  if (!s) return '—';
  const d = typeof s === 'string' ? (s.length === 10 ? parseISODate(s) : new Date(s)) : s;
  const base = `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`;
  return withWeekday ? `${capitalize(DAYS[d.getDay()])}, ${base}` : base;
}

export function formatShortDate(s: string | Date): string {
  const d = typeof s === 'string' ? (s.length === 10 ? parseISODate(s) : new Date(s)) : s;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatTime(s: string | Date): string {
  const d = typeof s === 'string' ? new Date(s) : s;
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(s: string): string {
  const d = new Date(s);
  return `${capitalize(DAYS[d.getDay()])} ${d.getDate()} de ${MONTHS[d.getMonth()]} · ${formatTime(d)}`;
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function monthName(m: number) {
  return capitalize(MONTHS[m]);
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Lunes de la semana de la fecha dada */
export function startOfWeek(d: Date) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (r.getDay() + 6) % 7;
  r.setDate(r.getDate() - day);
  return r;
}

export function ageInMonths(birth: string | null, at: Date = new Date()): number | null {
  if (!birth) return null;
  const b = parseISODate(birth);
  let m = (at.getFullYear() - b.getFullYear()) * 12 + (at.getMonth() - b.getMonth());
  if (at.getDate() < b.getDate()) m -= 1;
  return Math.max(0, m);
}

export function ageLabel(birth: string | null): string {
  const m = ageInMonths(birth);
  if (m === null) return 'Edad sin indicar';
  if (m < 24) return `${m} ${m === 1 ? 'mes' : 'meses'}`;
  const y = Math.floor(m / 12);
  const rest = m % 12;
  return `${y} años${rest ? ` y ${rest} ${rest === 1 ? 'mes' : 'meses'}` : ''}`;
}

/** Documento de histórico de patologías que corresponde según la edad. */
export function pathologyRangeFor(child: Child): PathologyRange {
  if (child.pathology_range) return child.pathology_range;
  const m = ageInMonths(child.birth_date, child.intervention_start ? parseISODate(child.intervention_start) : new Date());
  if (m === null || m >= 12) return '12-24';
  if (m >= 8) return '8-12';
  return '4-7';
}

/**
 * Semana de intervención en la que se encuentra el peque.
 * 0 = todavía no ha comenzado; > weeks = finalizada.
 */
export function interventionWeek(child: Child, today: Date = new Date()): number {
  if (child.status !== 'intervencion' && child.status !== 'finalizada') return 0;
  if (child.status === 'finalizada') return child.intervention_weeks + 1;
  if (!child.intervention_start) return 1;
  const start = parseISODate(child.intervention_start);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.floor((t.getTime() - start.getTime()) / 86400000);
  if (days < 0) return 0;
  return Math.min(Math.floor(days / 7) + 1, child.intervention_weeks);
}

/** Fecha de inicio (lunes o fecha de inicio) de la semana N de intervención. */
export function weekStartDate(child: Child, week: number): string | null {
  if (!child.intervention_start) return null;
  return toISODate(addDays(parseISODate(child.intervention_start), (week - 1) * 7));
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export function greeting(d: Date = new Date()) {
  const h = d.getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 14) return 'Buenos días';
  if (h < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Hora a la que terminará algo que empieza ahora y dura `minutes` minutos.
 * Si cae en otro día devuelve también los días de diferencia (p. ej. "07:10 (+1d)").
 */
export function endTimePreview(minutes: number, from: Date = new Date()) {
  const end = new Date(from.getTime() + minutes * 60000);
  const time = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  const dayA = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const dayB = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  const days = Math.round((dayB - dayA) / 86400000);
  return { end, time, days, label: days > 0 ? `${time} (+${days}d)` : time };
}

/**
 * Primer día de la semana N del diario: el día exacto en que empieza esa semana
 * de intervención (inicio + 7·(N-1)). Si el peque aún no tiene fecha de inicio,
 * se usa la guardada en el diario o el lunes de esta semana.
 */
export function diaryWeekStart(child: Child | undefined | null, week: number, stored?: string | null): string {
  if (child?.intervention_start) return weekStartDate(child, week)!;
  return stored ?? toISODate(startOfWeek(new Date()));
}

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAY_SHORT = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const DAY_LETTER = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

/** Los 7 días de una semana del diario a partir de su primer día (con nombre real de cada día). */
export function diaryDays(startIso: string) {
  const start = parseISODate(startIso);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const w = d.getDay();
    return {
      date: d,
      iso: toISODate(d),
      name: DAY_NAMES[w],
      short: DAY_SHORT[w],
      letter: DAY_LETTER[w],
      /** "Mi 18/11" */
      label: `${DAY_SHORT[w]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
    };
  });
}
