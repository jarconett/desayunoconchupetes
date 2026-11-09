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
2. Ve a **SQL Editor** y ejecuta, **en este orden**, el contenido de:
   1. [`supabase/migrations/20261109000000_esquema_inicial.sql`](supabase/migrations/20261109000000_esquema_inicial.sql)
   2. [`supabase/migrations/20261110000000_consentimientos_y_avisos.sql`](supabase/migrations/20261110000000_consentimientos_y_avisos.sql) (consentimientos de cookies y protección de datos, arreglo de avisos y notificación de prueba)
3. En **Authentication → URL Configuration**:
   - **Site URL**: `desayunoconchupetes://` (o la dirección fija de la web si la tienes). Es a donde lleva un enlace de correo cuando no se indica otra cosa; el valor por defecto (`http://localhost:3000`) provoca el error *Cannot GET /*.
   - **Redirect URLs**: `desayunoconchupetes://**`, `https://*.trycloudflare.com/**` y `http://localhost:8080/**` (y tu dominio, si lo tienes).
4. (Opcional) En **Authentication → Email Templates** traduce los correos al español.

> 🔐 La cuenta que se registre con **desayunoconchupetes@gmail.com** se crea automáticamente como **administradora**. Desde *Usuarios* puede dar acceso de administradora a otras personas.

### 1b. Correos (recuperar contraseña y confirmar cuenta)
El correo integrado de Supabase **solo envía a los miembros del equipo del proyecto** y muy pocos por hora, así que para las familias hay que usar un SMTP propio. Con Gmail es gratis:
1. En la cuenta de Google de desayunoconchupetes@gmail.com activa la **verificación en 2 pasos** y crea una **contraseña de aplicación** en <https://myaccount.google.com/apppasswords>.
2. Supabase → **Authentication → Emails → SMTP Settings** → *Enable custom SMTP*: host `smtp.gmail.com`, puerto `465`, usuario `desayunoconchupetes@gmail.com`, contraseña = la contraseña de aplicación (16 letras, sin espacios), remitente `desayunoconchupetes@gmail.com`, nombre `Desayuno con Chupetes`.
3. Supabase → **Authentication → Emails → Templates → Reset Password**: la app pide un **código**, así que la plantilla debe incluir `{{ .Token }}`. Asunto: `Tu código para crear una nueva contraseña`. Cuerpo:
   ```html
   <h2>Desayuno con Chupetes</h2>
   <p>Tu código para crear una nueva contraseña es:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>Escríbelo en la app junto con tu nueva contraseña. Caduca en 1 hora.</p>
   <p>Si no lo has pedido tú, ignora este correo.</p>
   ```
4. **Templates → Confirm signup**: al crear la cuenta la app también pide un **código** (funciona igual en web y móvil). Asunto: `Confirma tu cuenta de Desayuno con Chupetes`. Cuerpo:
   ```html
   <h2>Desayuno con Chupetes</h2>
   <p>¡Bienvenida/o! Tu código para activar la cuenta es:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>Escríbelo en la app. Si estás en el mismo dispositivo también puedes <a href="{{ .ConfirmationURL }}">pulsar aquí</a>.</p>
   ```

### 2. Configurar la app
```bash
npm install
cp .env.example .env   # y rellena EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY
```
Los valores están en Supabase → **Project Settings → API**.

### 3. Probar en local

#### Alojar la app gratis en un PC con Windows: `iniciar-desayunoconchupetes.bat`
El PC hace de servidor de la web y la publica en internet con un **túnel gratuito de Cloudflare** (sin cuenta, sin abrir puertos del router). Los datos siguen en Supabase (plan gratuito).

1. Descarga el proyecto: `git clone https://github.com/jarconett/desayunoconchupetes.git` (recomendado, así se actualiza solo) o *Code → Download ZIP* y descomprímelo.
2. En Supabase → **Authentication → URL Configuration** añade como *Redirect URL* `https://*.trycloudflare.com/**` (para los correos de recuperar contraseña).
3. Doble clic en **`iniciar-desayunoconchupetes.bat`**. El script:
   - comprueba **Node.js 20+** (si falta, ofrece instalarlo con `winget`),
   - **actualiza** el proyecto desde GitHub (`git pull`) si se descargó con git,
   - instala las dependencias (solo la primera vez o si cambian),
   - pide la **URL y la clave anon de Supabase** la primera vez y las guarda en `.env`,
   - **genera la web** (`dist/`) solo cuando hay cambios,
   - arranca el servidor web (`servidor/servidor-web.js`, sin dependencias) en `http://localhost:8080` y en la red local,
   - descarga `cloudflared` (solo la primera vez) y abre el túnel: muestra el **enlace público** `https://xxxx.trycloudflare.com`, lo copia al portapapeles y lo guarda en `ENLACE-PUBLICO.txt`,
   - si se corta internet, reabre el túnel solo.
4. Deja la ventana abierta mientras quieras que la app esté disponible. **Q** la detiene.

> ⚠️ El enlace gratuito de Cloudflare **cambia cada vez que se reinicia** el servidor y la app solo está disponible mientras el PC esté encendido. Para una dirección fija (p. ej. `app.desayunoconchupetes.com`) hace falta un dominio propio y un *túnel con nombre* de Cloudflare (también gratis), o publicar `dist/` en Netlify/Cloudflare Pages.
>
> Para que arranque solo al encender el PC: `Win + R` → `shell:startup` y crea ahí un acceso directo al `.bat`.
>
> Los registros están en `logs/` (servidor y túnel).

#### Crear la APK de Android: `crear-apk.bat`
Doble clic en **`crear-apk.bat`**. Compila la app en los servidores de Expo (**EAS Build, plan gratuito**; la primera vez pide iniciar sesión o crear cuenta en <https://expo.dev> y generar el *keystore*: responde **Y**), espera a que termine (10-30 min) y descarga la APK en **`<unidad>:\DesayunoConChupetes-APK`** (p. ej. `D:\DesayunoConChupetes-APK`) junto con `COMO-INSTALAR.txt` y el enlace de descarga directa para el móvil. La APK lleva dentro los datos de Supabase de `.env` (gracias a `.easignore`).

#### Manual
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
Para iOS, EAS gestiona la clave APNs.

#### Notificaciones push en Android (Firebase, gratis)
Los **recordatorios del plan** son locales y funcionan sin esto. Los **avisos de la asesora** (cita confirmada, plan actualizado, resúmenes…) llegan por push y en Android necesitan Firebase:
1. <https://console.firebase.google.com> → *Crear proyecto* (sin Analytics).
2. *Añadir app → Android*, nombre del paquete **`com.desayunoconchupetes.app`** → descarga **`google-services.json`** y guárdalo en la raíz del proyecto (al lado de `app.json`). `app.config.js` lo detecta solo.
3. Firebase → ⚙️ *Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada* (descarga un `.json`).
4. <https://expo.dev> → tu proyecto → *Credentials → Android → com.desayunoconchupetes.app → FCM V1 service account key → Add* → sube ese `.json`.
5. Vuelve a crear la APK (`crear-apk.bat`) e instálala. En la app: *Perfil/Ajustes → Probar notificaciones*.

> En Xiaomi/Redmi/POCO: Ajustes → Aplicaciones → Desayuno con Chupetes → *Inicio automático* activado, *Ahorro de batería: Sin restricciones* y en Notificaciones permite *Pantalla de bloqueo* y *Notificaciones flotantes*.

### 5. Publicar la web
```bash
npm run build:web      # genera dist/
```
Sube la carpeta `dist/` a cualquier hosting estático (Netlify, Vercel, Cloudflare Pages o `npx eas-cli@latest deploy`). Configura la redirección de todas las rutas a `index.html` (SPA).

---

## ⚙️ Personalización
- **Textos legales** (política de cookies y protección de datos) y **datos de la responsable** (nombre, NIF, dirección): [`src/lib/legal.ts`](src/lib/legal.ts). Rellena los campos entre corchetes y haz que los revise una asesoría legal. Si cambias un texto, sube su versión para que la app vuelva a pedir la aceptación.
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
