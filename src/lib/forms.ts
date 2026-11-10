// Contenido de los documentos de la asesoría, transcrito para usarlo dentro de la app.
import type { DiaryState, PathologyRange, PlanContent, ReminderKey } from './types';

// ---------------------------------------------------------------------
// FICHA DE SUEÑO (entrevista inicial · la rellena la administradora)
// ---------------------------------------------------------------------
export interface FieldDef {
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
}

export interface FieldSection {
  title: string;
  icon: string;
  fields: FieldDef[];
}

export const SLEEP_SHEET_SECTIONS: FieldSection[] = [
  {
    title: 'Datos generales',
    icon: 'card-account-details-outline',
    fields: [
      { key: 'fecha', label: 'Fecha' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'sexo', label: 'Sexo' },
      { key: 'edad', label: 'Edad / fecha de nacimiento' },
      { key: 'padres', label: 'Nombres de los padres' },
      { key: 'telefono', label: 'Teléfono' },
      { key: 'email', label: 'Email' },
      { key: 'alimentacion', label: 'Tipo de alimentación', multiline: true },
      { key: 'cambios', label: 'Cambios actuales', multiline: true },
    ],
  },
  {
    title: 'Consulta',
    icon: 'chat-question-outline',
    fields: [
      { key: 'motivo', label: 'Motivo de la consulta', multiline: true },
      { key: 'que_ocurre', label: 'Qué ocurre y desde cuándo', multiline: true },
      { key: 'probado', label: 'Qué habéis probado', multiline: true },
      { key: 'expectativas', label: 'Expectativas', multiline: true },
    ],
  },
  {
    title: 'Revisión sueño diurno',
    icon: 'weather-sunny',
    fields: [
      { key: 'siestas_cuantas', label: 'Cuántas siestas' },
      { key: 'siestas_cuando', label: 'Cuándo las hace', multiline: true },
      { key: 'siestas_como', label: 'Cómo las hace', multiline: true },
      { key: 'siestas_donde', label: 'Dónde' },
      { key: 'siestas_tarda', label: 'Cuánto tarda en dormirse' },
      { key: 'siestas_duracion', label: 'Duración de la siesta' },
    ],
  },
  {
    title: 'Revisión rutina y ambiente',
    icon: 'weather-night',
    fields: [
      { key: 'hora_dormir', label: 'Hora de dormir' },
      { key: 'hora_despertar', label: 'Hora de despertar' },
      { key: 'hora_antes', label: 'Qué hacéis una hora antes de ir a la cama', multiline: true },
      { key: 'donde_duerme', label: 'Dónde duerme' },
      { key: 'como_duerme', label: 'Cómo se duerme', multiline: true },
      { key: 'noche_tarda', label: 'Cuánto tarda en dormirse' },
      { key: 'despertares', label: '¿Se despierta? ¿Cuántas veces?' },
      { key: 'despertares_que', label: 'Si se despierta, ¿qué hace?', multiline: true },
      { key: 'despierto_rato', label: '¿Cuánto rato permanece despierto?' },
      { key: 'horas_seguidas', label: '¿Cuántas horas duerme seguidas?' },
      { key: 'cenas', label: 'Cenas', multiline: true },
    ],
  },
  {
    title: 'Notas de la asesora',
    icon: 'notebook-edit-outline',
    fields: [{ key: 'notas', label: 'Observaciones internas', multiline: true }],
  },
];

// ---------------------------------------------------------------------
// HISTÓRICO DE PATOLOGÍAS (según edad)
// ---------------------------------------------------------------------
export interface PathologyQuestion {
  key: string;
  label: string;
  /** 'yesno' = marcar SI / NO; 'text' = respuesta libre */
  type: 'yesno' | 'text';
  help?: string;
}

export interface PathologySection {
  title: string;
  note?: string;
  questions: PathologyQuestion[];
}

const q = (key: string, label: string, help?: string): PathologyQuestion => ({ key, label, type: 'yesno', help });

const GENERAL: PathologySection = {
  title: 'Información general',
  questions: [
    { key: 'patologia', label: '¿Alguna patología? (actual o pasada)', type: 'text' },
    { key: 'medicacion', label: '¿Alguna medicación actual?', type: 'text' },
  ],
};

const COMUNES_BEBE = [
  q('regurgita', '¿Regurgita tomas de manera habitual?'),
  q('mucosidad', '¿Mucosidad blanca?'),
  q('irritable', '¿Está irritable durante todo el día y noche? ¿Encuentra consuelo en posición vertical?'),
];
const COMUNES_BASE = [
  q('piel_irritada', '¿Tiene alguna zona de la piel irritada o lesiones?'),
  q('intranquilidad', '¿Presenta intranquilidad después de comer? (gases, estómago hinchado…)'),
  q('heces', '¿Cambio en las heces?'),
  q('erupciones', '¿Erupciones en la piel?'),
  q('ronca', '¿Ronca de manera habitual?'),
  q('boca_abierta', '¿Duerme con la boca abierta?'),
  q('respirar', '¿Dificultad para respirar?'),
];
const COMUNES_MAYOR = [
  q('picor_anal', '¿Picor anal?'),
  q('despertares_irritacion', '¿Despertares con irritación?'),
  q('dolor_barriga', '¿Dolor de barriga de forma habitual?'),
];
const DESORDENES_BASE = [
  q('balanceo', '¿Balanceo de cabeza y cuerpo a la hora de dormir?'),
  q('guturales', '¿Hace sonidos guturales (como gruñidos) a la hora de dormir aproximadamente durante 15 minutos?'),
  q('piernas', '¿A la hora de dormir tiene la necesidad de mover las piernas? ¿Intenta relajarse y no puede?'),
];
const DESORDENES_MAYOR = [
  q('rechina', '¿Rechina los dientes?'),
  q('dolor_cabeza', '¿Dolores de cabeza?'),
  q('baja_actividad', '¿Durante el día tiene baja actividad o sueño todo el día?'),
  q('deshoras', '¿Se duerme a deshoras?'),
];
const TERRORES: PathologySection = {
  title: 'Terrores nocturnos y pesadillas',
  note: 'Las 2 siguientes son más complicadas de detectar a esta edad.',
  questions: [
    q(
      'terrores',
      'Terrores nocturnos',
      'Se dan durante las 3 horas siguientes a dormir · despertar a gritos · normalmente no reconocen al adulto',
    ),
    q('pesadillas', 'Pesadillas', 'Suelen ser al final de la noche · reconocen al adulto'),
  ],
};

export const PATHOLOGY_FORMS: Record<PathologyRange, { title: string; sections: PathologySection[] }> = {
  '4-7': {
    title: 'Histórico de patologías de 4 a 7 meses',
    sections: [
      GENERAL,
      { title: 'Enfermedades comunes', questions: [...COMUNES_BEBE, ...COMUNES_BASE] },
      { title: 'Desórdenes relacionados con el sueño', questions: DESORDENES_BASE },
      TERRORES,
    ],
  },
  '8-12': {
    title: 'Histórico de patologías de 8 a 12 meses',
    sections: [
      GENERAL,
      { title: 'Enfermedades comunes', questions: [...COMUNES_BEBE, ...COMUNES_BASE, ...COMUNES_MAYOR] },
      { title: 'Desórdenes relacionados con el sueño', questions: DESORDENES_BASE },
      TERRORES,
    ],
  },
  '12-24': {
    title: 'Histórico de patologías de 12 a 24 meses (y de 24 meses en adelante)',
    sections: [
      GENERAL,
      { title: 'Enfermedades comunes', questions: [...COMUNES_BASE, ...COMUNES_MAYOR] },
      { title: 'Desórdenes relacionados con el sueño', questions: [...DESORDENES_BASE, ...DESORDENES_MAYOR] },
      TERRORES,
    ],
  },
};

export const PATHOLOGY_RANGE_LABEL: Record<PathologyRange, string> = {
  '4-7': '4 a 7 meses',
  '8-12': '8 a 12 meses',
  '12-24': '12 a 24 meses y más',
};

// ---------------------------------------------------------------------
// DIARIO DE SUEÑO SEMANAL
// ---------------------------------------------------------------------
export const DIARY_STATES: { key: DiaryState; label: string; short: string; color: string; text: string; icon: string }[] = [
  { key: 'despierto', label: 'Despierto', short: 'Desp.', color: '#FFF2C7', text: '#8A6A12', icon: 'white-balance-sunny' },
  { key: 'siesta', label: 'Siesta', short: 'Siesta', color: '#DDF1E6', text: '#3E7D5C', icon: 'sleep' },
  { key: 'rutina', label: 'Rutina', short: 'Rutina', color: '#FBE3D6', text: '#A75D40', icon: 'bathtub-outline' },
  { key: 'dormido', label: 'Dormido', short: 'Dorm.', color: '#DCE2F2', text: '#3D4A70', icon: 'weather-night' },
  { key: 'despertar', label: 'Desp. nocturno', short: 'D.N.', color: '#F8DDE4', text: '#A24A63', icon: 'alarm-light-outline' },
  // Violeta intenso: se distingue bien de los demás colores (todos pastel claros)
  { key: 'llanto', label: 'Llanto', short: 'Llanto', color: '#C9AEF2', text: '#4E2A86', icon: 'emoticon-cry-outline' },
];

export const DIARY_STATE_MAP = Object.fromEntries(DIARY_STATES.map((s) => [s.key, s])) as Record<
  DiaryState,
  (typeof DIARY_STATES)[number]
>;

export const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WEEK_DAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Filas del diario: de 8 am a 7 am del día siguiente, como en la plantilla. */
export const DIARY_HOURS = Array.from({ length: 24 }, (_, i) => (i + 8) % 24);

export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

export const DIARY_INSTRUCTIONS =
  'Rellenad esta tabla poniendo a qué horas del día está despierto, si hace siesta, la hora a la que empezáis la rutina antes de dormir y hasta qué hora dura, la hora a la que se va a dormir y los despertares nocturnos. Si llora, marcad «Llanto» en los cuartos de hora que dure (de día o de noche). Cada hora se divide en cuartos (15, 30, 45 y 60 minutos): tocad la hora para marcarla entera o solo los cuartos que correspondan.';

export const SLEEP_SIGNALS = [
  {
    title: 'Cuando solo controlan la cabeza',
    text: 'Bostezos, esconden la cabeza en el pecho de mamá o papá, apartan la mirada…',
  },
  {
    title: 'Cuando ya controlan los brazos',
    text: 'Además de lo anterior, se llevan las manos a la cara, se frotan los ojos o se tiran de las orejas y el pelo.',
  },
  {
    title: 'Cuando ya gatean o andan',
    text: 'Todo lo anterior y además pierden la coordinación, se caen y tropiezan con facilidad. También puede pasar lo contrario: mucha actividad, como si lucharan contra el sueño.',
  },
];

// ---------------------------------------------------------------------
// PLAN DE SUEÑO
// ---------------------------------------------------------------------
export const PLAN_SECTIONS: { key: keyof Omit<PlanContent, 'schedule'>; title: string; icon: string; hint: string }[] = [
  {
    key: 'evaluacion',
    title: 'Evaluación inicial',
    icon: 'clipboard-text-search-outline',
    hint: 'Qué observamos en los documentos, el diario de sueño y la entrevista.',
  },
  {
    key: 'objetivos',
    title: 'Lo que conseguiremos de forma progresiva',
    icon: 'star-shooting-outline',
    hint: 'Objetivos de la intervención.',
  },
  {
    key: 'intervencion',
    title: 'Intervención',
    icon: 'calendar-star',
    hint: 'En qué nos centramos estas semanas.',
  },
  { key: 'siestas', title: 'Siestas', icon: 'weather-sunset', hint: 'Horario de siestas, rutina pre-siesta, cómo lo hacemos…' },
  {
    key: 'noches',
    title: 'Noches y rutina de buenas noches',
    icon: 'weather-night',
    hint: 'Rutina, cena, ambiente (1,2,3 DESCANSO), hora de ir a dormir…',
  },
  {
    key: 'despertares',
    title: 'En los despertares nocturnos',
    icon: 'alarm-light-outline',
    hint: 'Cómo actuar ante los despertares.',
  },
  {
    key: 'mejorar',
    title: 'Cosas para mejorar',
    icon: 'sprout-outline',
    hint: 'Problemas asociados a la edad: terrores, pesadillas, angustia de separación…',
  },
  {
    key: 'consideraciones',
    title: 'Consideraciones finales',
    icon: 'heart-outline',
    hint: 'Constancia, calma y comprensión.',
  },
];

export const REMINDERS: { key: ReminderKey; label: string; message: string; icon: string; color: string }[] = [
  { key: 'nap_start', label: 'Inicio de la siesta', message: 'Es la hora de la siesta 😴', icon: 'weather-sunset-down', color: colorsFor('mint') },
  { key: 'nap_end', label: 'Fin de la siesta', message: 'Hora de despertar de la siesta ☀️', icon: 'weather-sunset-up', color: colorsFor('butter') },
  { key: 'routine_start', label: 'Inicio rutina de buenas noches', message: 'Empezamos la rutina de buenas noches 🛁', icon: 'bathtub-outline', color: colorsFor('peach') },
  { key: 'bedtime', label: 'Hora de irse a dormir', message: 'Es la hora de ir a dormir. ¡Dulces sueños! 🌙', icon: 'weather-night', color: colorsFor('lavender') },
];

function colorsFor(name: 'mint' | 'butter' | 'peach' | 'lavender') {
  return { mint: '#DDF1E6', butter: '#FFF2C7', peach: '#FBE3D6', lavender: '#E8E1F5' }[name];
}

// ---------------------------------------------------------------------
// DOCUMENTO 1,2,3 DESCANSO
// ---------------------------------------------------------------------
export const DESCANSO_DOC_KEY = '123_descanso';

export interface DocBlock {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface DocChapter {
  number: string;
  title: string;
  icon: string;
  color: string;
  blocks: DocBlock[];
  table?: { headers: string[]; rows: string[][] };
}

export const DESCANSO_DOC: DocChapter[] = [
  {
    number: '1',
    title: 'Ambiente',
    icon: 'lamp-outline',
    color: '#E8E1F5',
    blocks: [
      {
        heading: 'Iluminación',
        bullets: [
          'Que haya oscuridad para dormir. Si son niños más mayores y tienen miedo, alguna bombilla de bajo voltaje o un regulador en el interruptor, de color naranja o rojo.',
          'Evitar pantallas azules (móviles, tablet, televisión…) dos horas antes de ir a dormir.',
        ],
      },
      {
        heading: 'Ruidos',
        bullets: [
          'Los niños se adaptan a los ruidos habituales, siempre y cuando no sean ruidos repentinos y exagerados. Vigilad que en la habitación donde duerme no se escuchen ruidos fuertes de la calle, voces en casa, el timbre… Si se sobresalta con facilidad será necesario tomar medidas para amortiguarlos.',
          'A algunos niños les ayuda un poco de "sonido de ambiente": siempre sonidos flojitos, de naturaleza por ejemplo.',
        ],
      },
      {
        heading: 'Temperatura',
        bullets: [
          'Lo ideal es que la habitación esté entre 18 y 20 grados. Se puede controlar con un termómetro.',
          'No abrigarlos en exceso.',
        ],
      },
      { heading: 'Humedad', bullets: ['Entre el 40% y el 70% es lo óptimo.'] },
      {
        heading: 'Ventilación',
        bullets: [
          'Ventilar la habitación 5 minutos antes de dormir, incluso en invierno: ayuda a renovar el aire y oxigenarlo, favoreciendo el descanso.',
        ],
      },
      {
        heading: 'Decoración',
        bullets: [
          'Para niños más mayores. Es importante que se sientan cómodos en su habitación; que participen en la decoración hará que la sientan suya.',
        ],
      },
    ],
  },
  {
    number: '2',
    title: 'Siestas',
    icon: 'weather-sunset',
    color: '#DDF1E6',
    blocks: [
      {
        paragraphs: [
          'El sueño diurno es importante para que los niños no lleguen con exceso de cansancio a la hora de dormir. Podéis orientaros con la tabla de siestas (son tiempos orientativos).',
          'Es importante identificar las muestras de cansancio y señales de sueño para adelantarse y ayudar al niño a conciliar el sueño. Las señales según la edad suelen ser:',
        ],
        bullets: [
          'Cuando solo controlan la cabeza: bostezan, esconden la cara contra el pecho del cuidador, apartan la mirada.',
          'Cuando tienen control de los brazos: además de lo anterior, se pueden frotar los ojos y tirarse del pelo o las orejas.',
          'Cuando ya gatean o andan: suelen bajar la actividad, tienen menos coordinación, se caen o tropiezan con facilidad, o puede ocurrir que tengan una gran actividad en la que parezca que luchan contra el sueño.',
        ],
      },
    ],
    table: {
      headers: ['Edad', 'Nº siestas', 'Sueño de día total', 'Duración de cada siesta', 'Despiertos entre siestas'],
      rows: [
        ['0-12 m', '6-8', '4-5 h', '15 min-4 h', '30 min-1 h'],
        ['3-4 m', '4-5', '3-4 h', '30 min-2 h', '1-2 h'],
        ['5-6 m', '2', '2,5-3,5 h', '30 min-2 h', '2 h'],
        ['7-8 m', '2', '2-3 h', '1-2 h', '2-3 h'],
        ['9-12 m', '2', '2-3 h', '1-2 h', '3-4 h'],
        ['13-17 m', '1', '2-3 h', '1-3 h', '3-5 h'],
        ['18 m-3 años', '1', '1-3 h', '1,5-2,5 h', '5-6 h'],
      ],
    },
  },
  {
    number: '3',
    title: 'Rutinas',
    icon: 'book-open-page-variant-outline',
    color: '#FBE3D6',
    blocks: [
      {
        bullets: [
          'Los niños aprenden con la repetición: les gusta saber qué va a pasar y la previsibilidad. Por eso es importante repetir las rutinas cada día.',
          'No hace falta que sean estrictas. Si un día se alarga y no da tiempo a toda la rutina, pueden acortarse los pasos o saltarse alguno; no pasa nada.',
          'Establecer una hora fija de irse a la cama para poder empezar con la rutina antes. El tiempo empleado en la rutina cambiará con la edad: un niño más mayor necesitará una rutina más elaborada.',
          'Ni demasiado largas ni demasiado cortas. Hasta 1 año, una hora aproximadamente (baño, cena, mecerlo y a dormir). Con 2 años, hasta 2 horas (baño, cena, leer un cuento, hablar de cómo ha ido el día…). Vosotros elegís qué rutina queréis hacer.',
          'La rutina debe ser relajante, tranquila y agradable para el niño y para los padres: es algo que se va a repetir en el tiempo. Nada de juegos activos.',
        ],
      },
    ],
  },
];
