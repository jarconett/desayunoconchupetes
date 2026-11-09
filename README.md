# Desayuno con Chupetes · App de asesoría de sueño infantil

App **web, Android e iOS** (un único código, hecho con [Expo](https://expo.dev) + React Native) para el servicio de asesoría de sueño infantil de **Desayuno con Chupetes**.

📧 desayunoconchupetes@gmail.com · 📸 [@desayunoconchupetes](https://instagram.com/desayunoconchupetes)

---

## ✨ Qué hace

### Familias
- **Registro e inicio de sesión** (email + contraseña, recuperación de contraseña).
- **Alta del peque** (nombre, sexo, fecha de nacimiento, padres).
- **Citas**: solicitar la *entrevista inicial* y las *evaluaciones semanales* eligiendo día y hora en un calendario con los huecos libres. Cancelación de citas.
- **Mi espacio**: documentos que se **desbloquean** cuando la asesora acepta la intervención:
  - **1, 2, 3 DESCANSO** (lectura, se marca como leído y queda siempre accesible).
  - **Histórico de patologías** según la edad (4-7 meses, 8-12 meses, 12-24 meses y más), con respuestas Sí/No y comentarios.
  - **Diario de sueño semanal** (6 semanas): rejilla de 8:00 a 7:00 × 7 días. Se elige un estado (Despierto, Siesta, Rutina, Dormido, Despertar nocturno, D.N./dormido) y se tocan las horas. Copiar día anterior, notas por día, vista de tabla semanal y resumen de horas de sueño.
  - **Resúmenes de sesión** que envía la asesora tras cada evaluación.
- **Solicitud de intervención** desde la app tras la entrevista inicial.
- **Banner de tareas pendientes** en Inicio (y contador en la pestaña): leer 1,2,3 DESCANSO, completar el histórico, el diario de la semana en curso, agendar la evaluación semanal, leer resúmenes nuevos…
- **Indicador de semana de intervención** (semana X de 6) en el perfil del peque.
- **Plan de sueño**: plan personalizado, horario del día en línea de tiempo («lo próximo de hoy») e historial de ajustes.
- **Recordatorios** en el móvil: inicio de siesta, fin de siesta, inicio de rutina de buenas noches y hora de dormir. **Se reprograman solos** cuando la asesora cambia el plan.
- **Avisos** (centro de notificaciones + notificaciones push): cita confirmada, plan publicado/actualizado, nuevo resumen, etc.
- **Perfil**: datos, estado de la suscripción, peques y contacto (email/Instagram).

### Administradora
- **Agenda**: resumen (citas de hoy, solicitudes por confirmar, peques en intervención, tareas), solicitudes por confirmar, calendario semanal y lista del día. Confirmar / rechazar / marcar como realizada / cancelar / reprogramar, añadir enlace de videollamada y notas, crear citas directamente.
- **Tareas pendientes** de la administradora, automáticas y por peque (confirmar citas, completar ficha de sueño, revisar solicitudes de intervención, activar suscripción, preparar el plan tras el primer diario, escribir resúmenes, revisar nuevos diarios y ajustar el plan…) + **tareas manuales**.
- **Usuarios**: buscador y filtros, ficha de cada familia, **control de la suscripción** (estado, fechas, precio, pagado, notas), contacto rápido (email, llamada, WhatsApp) y dar/quitar acceso de administradora.
- **Ficha del peque**: semana de intervención, aceptar la intervención (fecha de inicio y duración, activa la suscripción), cambiar fechas, finalizar, documentos de la familia y citas.
- **Ficha de sueño** de la entrevista inicial (formulario completo).
- **Editor del plan de sueño** (con plantilla inicial basada en el plan tipo), recordatorios configurables con hora, activación y antelación, otros momentos del día, vista previa «como lo ve la familia» y **versionado** con nota de cambios por semana.
- **Resumen de sesión**: redactar, previsualizar y enviar a la familia.
- **Visor de diarios** con medias de sueño nocturno, siestas y despertares.

---

## 🧱 Tecnología

| Parte | Tecnología |
| --- | --- |
| App (web + Android + iOS) | Expo SDK 58, Expo Router, TypeScript |
| Backend | [Supabase](https://supabase.com): autenticación, PostgreSQL con Row Level Security, Realtime |
| Notificaciones push | Expo Push Service (lanzadas desde la base de datos con `pg_net`) |
| Recordatorios del plan | Notificaciones locales diarias (`expo-notifications`) |

Estructura:

```
src/
  app/
    (auth)/            login, registro, recuperar contraseña
    (familia)/         zona familias: (tabs) Inicio · Citas · Mi espacio · Plan · Perfil
                       + diario, histórico, 1,2,3 DESCANSO, resúmenes, avisos
    admin/             zona administradora: (tabs) Agenda · Usuarios · Avisos · Ajustes
                       + peque, familia, ficha de sueño, plan, resumen, diario
  components/          UI (tema pastel), calendario, diario, plan, etc.
  context/             sesión, datos de familia y de administración
  lib/                 Supabase, formularios (contenido de los documentos), fechas, tareas, notificaciones
supabase/migrations/   esquema de base de datos, permisos y avisos automáticos
```

---

## 🚀 Puesta en marcha

### 1. Crear el proyecto de Supabase
1. Crea una cuenta y un proyecto en <https://supabase.com> (región Europa).
2. Ve a **SQL Editor**, pega el contenido de [`supabase/migrations/20261109000000_esquema_inicial.sql`](supabase/migrations/20261109000000_esquema_inicial.sql) y ejecútalo.
3. En **Authentication → URL Configuration** añade como *Redirect URL* la URL de la web (p. ej. `https://tu-dominio.com/*`) y `desayunoconchupetes://*`.
4. (Opcional) En **Authentication → Email Templates** traduce los correos al español.

> 🔐 La cuenta que se registre con **desayunoconchupetes@gmail.com** se crea automáticamente como **administradora**. Desde *Usuarios* puede dar acceso de administradora a otras personas.

### 2. Configurar la app
```bash
npm install
cp .env.example .env   # y rellena EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY
```
Los valores están en Supabase → **Project Settings → API**.

### 3. Probar en local
```bash
npm run web        # en el navegador
npm start          # escanea el QR con Expo Go (Android/iOS)
```
> Las **notificaciones push** no funcionan en Expo Go en Android: necesitas una *development build* (paso 4). Los recordatorios locales sí.

### 4. Notificaciones push y apps de Android / iOS
```bash
npx eas-cli@latest login
npx eas-cli@latest init          # rellena extra.eas.projectId en app.json
npx eas-cli@latest build -p android --profile preview      # APK para probar
npx eas-cli@latest build -p android --profile production   # Google Play
npx eas-cli@latest build -p ios --profile production       # App Store (requiere cuenta de Apple Developer)
npx eas-cli@latest submit -p android   # / -p ios  para publicar en las tiendas
```
Para Android hay que subir las credenciales de FCM en expo.dev (Credentials → *FCM V1 service account key*); para iOS, EAS gestiona la clave APNs.

### 5. Publicar la web
```bash
npm run build:web      # genera dist/
```
Sube la carpeta `dist/` a cualquier hosting estático (Netlify, Vercel, Cloudflare Pages o `npx eas-cli@latest deploy`). Configura la redirección de todas las rutas a `index.html` (SPA).

---

## ⚙️ Personalización
- **Horarios de citas** (días, franjas, antelación): [`src/lib/config.ts`](src/lib/config.ts).
- **Colores y contacto**: [`src/lib/theme.ts`](src/lib/theme.ts).
- **Textos de los documentos** (ficha de sueño, históricos, diario, 1,2,3 DESCANSO, secciones del plan, recordatorios): [`src/lib/forms.ts`](src/lib/forms.ts).

## 🔒 Seguridad y datos
- Todas las tablas tienen **Row Level Security**: cada familia solo ve sus datos; la administradora lo ve todo.
- Las familias no pueden confirmar citas, cambiar el estado de la intervención ni su rol, ni editar resúmenes (lo impiden *triggers* en la base de datos).
- Los documentos de la intervención solo se pueden rellenar con la **suscripción activa**.
- Los datos de salud de menores son datos sensibles (RGPD): revisa con tu asesoría el aviso legal, la política de privacidad y el contrato de encargado del tratamiento con Supabase antes de lanzar la app.

## 🧪 Comprobaciones
```bash
npm run typecheck
npm run lint
```
