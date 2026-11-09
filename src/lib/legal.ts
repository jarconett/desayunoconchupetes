// =====================================================================
// TEXTOS LEGALES · Política de cookies y Protección de datos
//
// Datos de RESPONSABLE: de momento solo se muestran la marca y el correo.
// Si más adelante se rellenan nombre, NIF o dirección, aparecerán solos en los
// textos. Conviene que una asesoría legal revise los textos antes de publicar.
// Si cambias un texto de forma sustancial, sube su versión: la app volverá
// a pedir la aceptación a todas las personas usuarias.
// =====================================================================

import { CONTACT } from './theme';

export const RESPONSABLE = {
  /** Nombre y apellidos (o razón social) de la titular del servicio (opcional) */
  nombre: '',
  /** NIF (opcional) */
  nif: '',
  /** Dirección postal (opcional) */
  direccion: '',
  email: CONTACT.email,
  marca: 'Desayuno con Chupetes',
};

export const COOKIES_VERSION = 'cookies-v1-2026-11';
export const PROTECCION_DATOS_VERSION = 'datos-v1-2026-11';

export interface LegalSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

const R = RESPONSABLE;

/** "Desayuno con Chupetes (Nombre, con NIF X, domicilio en Y), correo: …" según los datos rellenados */
function responsable(): string {
  const extra = [R.nombre, R.nif && `con NIF ${R.nif}`, R.direccion && `con domicilio en ${R.direccion}`].filter(Boolean).join(', ');
  return `${R.marca}${extra ? ` (${extra})` : ''}, servicio de asesoría de sueño infantil, con correo electrónico de contacto ${R.email}`;
}

// ---------------------------------------------------------------------
// POLÍTICA DE COOKIES
// ---------------------------------------------------------------------
export const COOKIES_TITLE = 'Política de cookies';
export const COOKIES_SUMMARY =
  'Usamos únicamente cookies y almacenamiento técnico imprescindibles para que puedas iniciar sesión y la app funcione. No usamos cookies de publicidad, analítica ni de terceros con fines comerciales.';

export const COOKIES_POLICY: LegalSection[] = [
  {
    title: '1. ¿Qué son las cookies y tecnologías similares?',
    paragraphs: [
      'Las cookies son pequeños archivos que una web guarda en tu navegador. En las aplicaciones móviles se utilizan tecnologías equivalentes, como el almacenamiento local del dispositivo o identificadores para enviar notificaciones. En esta política llamamos «cookies» a todas ellas.',
    ],
  },
  {
    title: '2. ¿Quién es responsable?',
    paragraphs: [
      `${responsable()}.`,
    ],
  },
  {
    title: '3. ¿Qué cookies utiliza la app?',
    paragraphs: ['Solo utilizamos elementos técnicos, necesarios para prestarte el servicio que nos pides:'],
    bullets: [
      'Sesión (propia, técnica): guarda de forma segura tu inicio de sesión para que no tengas que escribir la contraseña cada vez. Se conserva hasta que cierras sesión o caduca.',
      'Preferencias (propia, técnica): recuerda tus ajustes, por ejemplo si tienes activados los recordatorios del plan de sueño. Se conserva hasta que la desactivas o desinstalas la app.',
      'Registro de consentimiento (propia, técnica): recuerda que ya has leído y aceptado esta política para no volver a mostrártela.',
      'Notificaciones (solo en el móvil, técnica): si das permiso, el sistema genera un identificador del dispositivo que usamos exclusivamente para enviarte avisos de la asesoría (citas, plan, resúmenes) y los recordatorios del plan.',
      'Seguridad de la red (de terceros, técnica): el proveedor que publica la versión web (Cloudflare) puede usar cookies de seguridad para proteger el servicio frente a ataques. No se usan para identificarte ni con fines publicitarios.',
    ],
  },
  {
    title: '4. ¿Usamos cookies de análisis o publicidad?',
    paragraphs: [
      'No. La app no contiene herramientas de analítica, publicidad, redes sociales ni seguimiento entre webs o aplicaciones. Las tipografías e iconos van incluidos en la propia app y no se descargan de servidores de terceros.',
    ],
  },
  {
    title: '5. Base legal',
    paragraphs: [
      'Las cookies técnicas son necesarias para prestar el servicio que solicitas, por lo que están exceptuadas del deber de consentimiento según el artículo 22.2 de la Ley 34/2002 (LSSI). Aun así, te informamos de ellas y registramos tu conformidad la primera vez que inicias sesión.',
    ],
  },
  {
    title: '6. ¿Cómo puedes eliminarlas?',
    paragraphs: [
      'Puedes cerrar sesión desde tu perfil, borrar los datos del sitio en la configuración de tu navegador o borrar los datos de la app (o desinstalarla) en los ajustes de tu móvil. También puedes retirar el permiso de notificaciones en los ajustes del sistema. Ten en cuenta que, sin las cookies técnicas, no podrás iniciar sesión ni usar la app.',
    ],
  },
  {
    title: '7. Cambios en esta política',
    paragraphs: [
      'Si en el futuro incorporamos otro tipo de cookies, actualizaremos esta política y te pediremos de nuevo tu conformidad antes de usarlas.',
      `Para cualquier duda puedes escribirnos a ${R.email}. Más información sobre cómo tratamos tus datos en el documento de Protección de datos.`,
    ],
  },
];

// ---------------------------------------------------------------------
// PROTECCIÓN DE DATOS (se acepta al solicitar la intervención)
// ---------------------------------------------------------------------
export const DATOS_TITLE = 'Información y consentimiento sobre protección de datos';

export function proteccionDatos(childName: string): LegalSection[] {
  const peque = childName || 'el/la menor';
  return [
    {
      title: '1. Responsable del tratamiento',
      paragraphs: [
        `${responsable()} (en adelante, «la asesora»).`,
      ],
    },
    {
      title: '2. ¿Qué datos tratamos?',
      paragraphs: ['Para prestar la asesoría trataremos los siguientes datos:'],
      bullets: [
        'De madres, padres o tutores: nombre y apellidos, DNI (solo en este consentimiento), correo electrónico, teléfono y comunicaciones mantenidas con la asesora.',
        `De ${peque}: nombre, sexo, fecha de nacimiento y edad.`,
        `Datos de salud y hábitos de ${peque} (categoría especial de datos): horarios, rutinas y registros de sueño (diario semanal), histórico de patologías, datos médicos que nos facilitéis, información de la entrevista inicial y notas y resúmenes de cada sesión.`,
        'Datos de facturación y de la suscripción al servicio.',
      ],
    },
    {
      title: '3. ¿Para qué los usamos?',
      paragraphs: [],
      bullets: [
        'Valorar el sueño del peque, elaborar y ajustar el plan de sueño personalizado y realizar el seguimiento de la intervención (6 semanas).',
        'Gestionar las citas, las evaluaciones semanales y las comunicaciones y avisos dentro de la app.',
        'Gestionar la suscripción, el cobro y las obligaciones legales, fiscales y contables.',
        'Solo si lo autorizas expresamente (casilla opcional): utilizar los registros de sueño de forma anonimizada —sin nombres ni datos que permitan identificaros— para formación y estudios sobre el sueño infantil.',
      ],
    },
    {
      title: '4. Base legal',
      paragraphs: [
        'La prestación del servicio que contratáis (art. 6.1.b del Reglamento General de Protección de Datos, RGPD) y vuestro consentimiento explícito para tratar los datos de salud del menor (arts. 6.1.a y 9.2.a RGPD). Al tratarse de un menor de 14 años, el consentimiento lo otorga quien ejerce la patria potestad o tutela (art. 7 de la Ley Orgánica 3/2018, LOPDGDD).',
        'Las obligaciones fiscales y contables se basan en el cumplimiento de una obligación legal (art. 6.1.c RGPD).',
        'Aportar los datos de sueño y salud es necesario para poder prestar la asesoría: si no se facilitan o no se autoriza su tratamiento, no será posible realizar la intervención.',
      ],
    },
    {
      title: '5. ¿Quién tiene acceso a los datos?',
      paragraphs: [
        'Únicamente la asesora. No cederemos los datos a terceros, salvo obligación legal o requerimiento judicial.',
        'Para que la app funcione contamos con proveedores tecnológicos que actúan como encargados del tratamiento, con contrato y garantías conforme al RGPD:',
      ],
      bullets: [
        'Supabase: alojamiento de la base de datos y de las cuentas de usuario (servidores en la Unión Europea).',
        'Expo (650 Industries): envío de notificaciones a los móviles.',
        'Proveedor de correo electrónico: envío de los correos de la cuenta (confirmación y recuperación de contraseña).',
        'Cloudflare: publicación segura de la versión web.',
      ],
    },
    {
      title: '6. Transferencias internacionales',
      paragraphs: [
        'Algunos de estos proveedores son empresas de Estados Unidos. Cuando acceden a datos lo hacen bajo el Marco de Privacidad de Datos UE-EE. UU. o las cláusulas contractuales tipo aprobadas por la Comisión Europea.',
      ],
    },
    {
      title: '7. ¿Cuánto tiempo los conservamos?',
      paragraphs: [
        'Durante la asesoría y, una vez finalizada, mientras mantengas tu cuenta para poder consultar el plan y los documentos. Si solicitas la baja, los datos de salud del menor se suprimirán y el resto se conservará bloqueado únicamente durante los plazos legales (por ejemplo, 5 años para posibles reclamaciones y los plazos fiscales aplicables). Los datos anonimizados para estudios, si lo autorizas, no permiten identificaros.',
      ],
    },
    {
      title: '8. Vuestros derechos',
      paragraphs: [
        `Podéis ejercer los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad, así como retirar este consentimiento en cualquier momento (sin que afecte a la licitud del tratamiento anterior), escribiendo a ${R.email}${R.direccion ? ' o a la dirección postal indicada' : ''}, indicando qué derecho queréis ejercer.`,
        'Si consideráis que no hemos tratado bien vuestros datos, podéis presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).',
      ],
    },
    {
      title: '9. Seguridad y confidencialidad',
      paragraphs: [
        'Los datos viajan cifrados y se almacenan con medidas de seguridad técnicas y organizativas adecuadas. Cada familia solo puede ver sus propios datos. La asesora guarda secreto profesional sobre toda la información facilitada.',
      ],
    },
    {
      title: '10. Consentimiento',
      paragraphs: [
        `Quien firma declara ser madre, padre o tutor/a legal de ${peque}, haber leído esta información y, marcando la casilla de autorización, CONSIENTE de forma libre, específica, informada e inequívoca el tratamiento de los datos personales y de salud de ${peque} y de los suyos propios con las finalidades descritas.`,
        'Si los progenitores comparten la patria potestad, quien firma declara actuar también con el conocimiento y la conformidad del otro progenitor.',
      ],
    },
  ];
}
