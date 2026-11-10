// =====================================================================
// Diario de sueño en franjas de 15 minutos
//
// Formato guardado (sleep_diaries.entries): día -> franja -> estado
//   franja = "H:MM" con MM en 00, 15, 30, 45   (p. ej. "8:00", "21:45")
// Compatibilidad: los diarios antiguos guardaban la hora entera ("8"), que
// equivale a sus cuatro cuartos. Al editar un día se convierte al formato nuevo.
// =====================================================================

import { DIARY_HOURS } from './forms';
import type { DiaryState } from './types';

export const QUARTERS = [0, 15, 30, 45] as const;
export type DayEntries = Record<string, DiaryState>;

export const slotKey = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`;
export const slotLabel = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/** Las 96 franjas del día del diario, de 8:00 a 7:45 del día siguiente. */
export const DIARY_SLOTS = DIARY_HOURS.flatMap((h) => QUARTERS.map((m) => ({ h, m, key: slotKey(h, m) })));

/** Estado de una franja (admite el formato antiguo por horas). */
export function getSlot(day: DayEntries | undefined, h: number, m: number): DiaryState | undefined {
  if (!day) return undefined;
  const v = (day[slotKey(h, m)] ?? day[String(h)]) as string | undefined;
  // Categoría antigua «D.N. / dormido (<1h)»: era un despertar nocturno corto
  return (v === 'dn_dormido' ? 'despertar' : v) as DiaryState | undefined;
}

/** Los 4 estados de una hora. */
export function hourQuarters(day: DayEntries | undefined, h: number): (DiaryState | undefined)[] {
  return QUARTERS.map((m) => getSlot(day, h, m));
}

/** Convierte un día al formato de franjas (expande las horas enteras antiguas). */
export function normalizeDay(day: DayEntries | undefined): DayEntries {
  const out: DayEntries = {};
  for (const { h, m, key } of DIARY_SLOTS) {
    const s = getSlot(day, h, m);
    if (s) out[key] = s;
  }
  return out;
}

/** Marca (o borra con null) varias franjas de un día y devuelve el día nuevo. */
export function setSlots(day: DayEntries | undefined, slots: { h: number; m: number }[], state: DiaryState | null): DayEntries {
  const out = normalizeDay(day);
  for (const { h, m } of slots) {
    if (state) out[slotKey(h, m)] = state;
    else delete out[slotKey(h, m)];
  }
  return out;
}

/** Nº de franjas de 15 min rellenadas. */
export function filledQuarters(day: DayEntries | undefined): number {
  return DIARY_SLOTS.filter(({ h, m }) => getSlot(day, h, m)).length;
}

/** Horas (en decimal) → "10 h 45 min" / "45 min" / "0" */
export function formatDuration(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h && !m) return '0';
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Horas (en decimal) → "10:45" (formato compacto para tablas) */
export function formatHM(hours: number): string {
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
