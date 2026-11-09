// Percentiles de duración del sueño (Iglowstein I. et al. Pediatrics 2003;111:302-307),
// los mismos de la hoja «Percentil sueño» del registro en Excel.
// Valores aproximados leídos de las gráficas: horas por edad para P2, P10, P25, P50, P75, P90 y P98.

export const PERCENTILES = [2, 10, 25, 50, 75, 90, 98] as const;

type Table = [ageMonths: number, values: [number, number, number, number, number, number, number]][];

/** Sueño total en 24 h */
const TOTAL: Table = [
  [1, [9.0, 10.5, 13.0, 14.4, 16.0, 18.0, 19.0]],
  [3, [10.3, 11.9, 13.1, 14.5, 15.9, 17.2, 18.8]],
  [6, [10.4, 11.9, 13.0, 14.2, 15.5, 16.6, 18.1]],
  [9, [10.5, 11.8, 12.8, 13.9, 15.1, 16.1, 17.4]],
  [12, [11.4, 12.4, 13.1, 13.9, 14.8, 15.5, 16.5]],
  [18, [11.1, 12.1, 12.8, 13.6, 14.4, 15.1, 16.1]],
  [24, [10.8, 11.7, 12.4, 13.2, 14.0, 14.7, 15.6]],
  [36, [10.2, 11.0, 11.8, 12.5, 13.3, 13.9, 14.8]],
  [48, [9.7, 10.5, 11.1, 11.8, 12.5, 13.1, 13.9]],
  [60, [9.5, 10.2, 10.7, 11.3, 12.0, 12.6, 13.2]],
  [72, [9.3, 9.9, 10.4, 11.0, 11.5, 12.0, 12.7]],
];

/** Sueño diurno (siestas) */
const DAYTIME: Table = [
  [1, [2.2, 3.4, 4.4, 5.5, 6.7, 7.7, 8.9]],
  [3, [1.3, 2.6, 3.5, 4.6, 5.7, 6.7, 7.9]],
  [6, [0.4, 1.5, 2.4, 3.4, 4.4, 5.2, 6.4]],
  [9, [0.2, 1.2, 1.9, 2.8, 3.6, 4.3, 5.3]],
  [12, [0.2, 1.0, 1.7, 2.4, 3.1, 3.8, 4.6]],
  [18, [0.5, 1.1, 1.5, 2.0, 2.6, 3.0, 3.6]],
  [24, [0.8, 1.2, 1.5, 1.8, 2.2, 2.5, 2.9]],
  [36, [0.8, 1.1, 1.4, 1.7, 2.0, 2.3, 2.6]],
  [48, [0.7, 1.0, 1.3, 1.5, 1.8, 2.0, 2.4]],
];

function valuesAt(table: Table, months: number): number[] | null {
  if (months < table[0][0] || months > table[table.length - 1][0]) return null;
  for (let i = 0; i < table.length - 1; i++) {
    const [a, va] = table[i];
    const [b, vb] = table[i + 1];
    if (months >= a && months <= b) {
      const t = (months - a) / (b - a);
      return va.map((v, k) => v + (vb[k] - v) * t);
    }
  }
  return table[table.length - 1][1];
}

export interface PercentileResult {
  /** Texto, p. ej. "entre P25 y P50" */
  band: string;
  /** Mediana (P50) para la edad */
  p50: number;
  /** -2 muy bajo · -1 bajo · 0 normal · 1 alto · 2 muy alto */
  level: -2 | -1 | 0 | 1 | 2;
}

function classify(table: Table, months: number | null, hours: number): PercentileResult | null {
  if (months == null || !Number.isFinite(hours)) return null;
  const v = valuesAt(table, months);
  if (!v) return null;
  let band: string;
  let level: PercentileResult['level'] = 0;
  if (hours < v[0]) {
    band = 'por debajo del P2';
    level = -2;
  } else if (hours > v[6]) {
    band = 'por encima del P98';
    level = 2;
  } else {
    let i = 0;
    while (i < 6 && hours > v[i + 1]) i++;
    band = i === 6 ? 'P98' : `entre P${PERCENTILES[i]} y P${PERCENTILES[i + 1]}`;
    if (i === 0) level = -1;
    else if (i >= 5) level = 1;
  }
  return { band, p50: Math.round(v[3] * 10) / 10, level };
}

export const totalSleepPercentile = (months: number | null, hours: number) => classify(TOTAL, months, hours);
export const daytimeSleepPercentile = (months: number | null, hours: number) => classify(DAYTIME, months, hours);
