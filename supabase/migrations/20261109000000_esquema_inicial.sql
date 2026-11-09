-- =====================================================================
--  Desayuno con Chupetes · Asesoría de sueño infantil
--  Esquema inicial de base de datos (Supabase / PostgreSQL)
-- =====================================================================
--  Roles:
--    admin   -> la asesora (desayunoconchupetes@gmail.com se crea como admin)
--    familia -> padres / madres
--
--  Flujo:
--    1. La familia se registra, añade a su peque y solicita la ENTREVISTA INICIAL.
--    2. La administradora confirma la cita y rellena la FICHA DE SUEÑO.
--    3. La familia solicita la INTERVENCIÓN; la administradora la acepta
--       (y activa la suscripción) -> se desbloquean documentos en "Mi espacio".
--    4. La familia completa HISTÓRICO DE PATOLOGÍAS (según edad), DIARIO DE SUEÑO
--       semanal (6 semanas) y lee "1,2,3 DESCANSO".
--    5. Tras el primer diario, la administradora publica el PLAN DE SUEÑO con
--       recordatorios (siesta, fin de siesta, rutina, hora de dormir).
--    6. Cada semana: cita de EVALUACIÓN + RESUMEN de sesión.
-- =====================================================================

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- Perfiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'familia' check (role in ('admin', 'familia')),
  full_name text not null default '',
  email text,
  phone text,
  push_token text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Al registrarse un usuario se crea su perfil. El email de la asesoría es admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone',
    case when lower(new.email) = 'desayunoconchupetes@gmail.com' then 'admin' else 'familia' end
  );
  insert into public.subscriptions (family_id, status) values (new.id, 'sin_suscripcion');
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Suscripciones (control desde administración)
-- ---------------------------------------------------------------------
create table public.subscriptions (
  family_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'sin_suscripcion'
    check (status in ('sin_suscripcion', 'activa', 'pausada', 'finalizada', 'cancelada')),
  plan_name text not null default 'Intervención 6 semanas',
  start_date date,
  end_date date,
  price numeric(10, 2),
  paid boolean not null default false,
  notes text,
  updated_at timestamptz not null default now()
);

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.has_active_subscription(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.family_id = uid
      and s.status = 'activa'
      and (s.end_date is null or s.end_date >= current_date)
  );
$$;

-- ---------------------------------------------------------------------
-- Peques
-- ---------------------------------------------------------------------
create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  sex text check (sex in ('niño', 'niña', 'otro')),
  birth_date date,
  parents_names text,
  -- entrevista -> intervencion -> finalizada
  status text not null default 'entrevista'
    check (status in ('entrevista', 'intervencion', 'finalizada')),
  intervention_start date,
  intervention_weeks int not null default 6,
  -- rango del histórico de patologías: si es null se calcula por edad
  pathology_range text check (pathology_range in ('4-7', '8-12', '12-24')),
  created_at timestamptz not null default now()
);
create index on public.children (family_id);

create or replace function public.owns_child(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.children where id = cid and family_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Citas (entrevista inicial y evaluaciones semanales)
-- ---------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  kind text not null check (kind in ('entrevista_inicial', 'evaluacion_semanal')),
  week_number int,
  starts_at timestamptz not null,
  duration_min int not null default 45,
  modality text not null default 'videollamada' check (modality in ('videollamada', 'llamada', 'presencial')),
  status text not null default 'solicitada'
    check (status in ('solicitada', 'confirmada', 'realizada', 'cancelada', 'rechazada')),
  family_notes text,
  admin_notes text,
  meeting_link text,
  created_at timestamptz not null default now()
);
create index on public.appointments (starts_at);
create index on public.appointments (family_id);

-- Huecos ocupados (sin datos personales) para que las familias vean disponibilidad
create or replace function public.busy_slots(from_ts timestamptz, to_ts timestamptz)
returns table (starts_at timestamptz, duration_min int)
language sql
stable
security definer
set search_path = public
as $$
  select a.starts_at, a.duration_min from public.appointments a
  where a.status in ('solicitada', 'confirmada')
    and a.starts_at >= from_ts and a.starts_at < to_ts;
$$;

-- ---------------------------------------------------------------------
-- Solicitudes de intervención
-- ---------------------------------------------------------------------
create table public.intervention_requests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  family_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pendiente' check (status in ('pendiente', 'aceptada', 'rechazada')),
  message text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------------------------------------------------------------------
-- Ficha de sueño inicial (la rellena la administradora en la entrevista)
-- ---------------------------------------------------------------------
create table public.sleep_sheets (
  child_id uuid primary key references public.children (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Histórico de patologías (lo rellena la familia según la edad)
-- ---------------------------------------------------------------------
create table public.pathology_histories (
  child_id uuid primary key references public.children (id) on delete cascade,
  age_range text not null check (age_range in ('4-7', '8-12', '12-24')),
  answers jsonb not null default '{}'::jsonb,
  submitted boolean not null default false,
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Diario de sueño semanal (6 semanas)
--   entries = { "0": { "8": "despierto", "9": "siesta", ... }, ..., "6": {...} }
--   día 0 = lunes ... 6 = domingo; horas 0..23
-- ---------------------------------------------------------------------
create table public.sleep_diaries (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  week_number int not null check (week_number between 1 and 12),
  week_start date,
  entries jsonb not null default '{}'::jsonb,
  day_notes jsonb not null default '{}'::jsonb,
  notes text,
  submitted boolean not null default false,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (child_id, week_number)
);

-- ---------------------------------------------------------------------
-- Lectura de documentos (1,2,3 DESCANSO)
-- ---------------------------------------------------------------------
create table public.document_reads (
  user_id uuid not null references public.profiles (id) on delete cascade,
  doc_key text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, doc_key)
);

-- ---------------------------------------------------------------------
-- Plan de sueño (editable por la administradora) + recordatorios
--   content   = secciones de texto del plan
--   reminders = { nap_start:{enabled,time}, nap_end:{...}, routine_start:{...}, bedtime:{...} }
-- ---------------------------------------------------------------------
create table public.sleep_plans (
  child_id uuid primary key references public.children (id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  reminders jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create table public.sleep_plan_versions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  version int not null,
  week_number int,
  change_note text,
  content jsonb not null,
  reminders jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Resúmenes de sesión (tras cada evaluación semanal)
-- ---------------------------------------------------------------------
create table public.session_summaries (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  appointment_id uuid references public.appointments (id) on delete set null,
  week_number int,
  title text not null,
  content text not null,
  sent boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tareas manuales de la administradora (además de las automáticas)
-- ---------------------------------------------------------------------
create table public.admin_tasks (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children (id) on delete cascade,
  title text not null,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Notificaciones (centro de avisos + push vía Expo)
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.children enable row level security;
alter table public.appointments enable row level security;
alter table public.intervention_requests enable row level security;
alter table public.sleep_sheets enable row level security;
alter table public.pathology_histories enable row level security;
alter table public.sleep_diaries enable row level security;
alter table public.document_reads enable row level security;
alter table public.sleep_plans enable row level security;
alter table public.sleep_plan_versions enable row level security;
alter table public.session_summaries enable row level security;
alter table public.admin_tasks enable row level security;
alter table public.notifications enable row level security;

-- Perfiles
create policy "perfil propio o admin (lectura)" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "perfil propio (edición)" on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- Evita que una familia se cambie el rol a sí misma
create or replace function public.protect_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role <> old.role and not public.is_admin() then
    raise exception 'Solo la administradora puede cambiar roles';
  end if;
  return new;
end; $$;
create trigger protect_role before update on public.profiles
  for each row execute function public.protect_role();

-- Suscripciones: la familia solo lee, la admin gestiona
create policy "suscripción lectura" on public.subscriptions for select
  using (family_id = auth.uid() or public.is_admin());
create policy "suscripción admin" on public.subscriptions for all
  using (public.is_admin()) with check (public.is_admin());

-- Peques: la familia crea y edita datos básicos de sus peques
create policy "peques lectura" on public.children for select
  using (family_id = auth.uid() or public.is_admin());
create policy "peques alta" on public.children for insert
  with check (family_id = auth.uid() or public.is_admin());
create policy "peques edición" on public.children for update
  using (family_id = auth.uid() or public.is_admin());
create policy "peques borrado admin" on public.children for delete
  using (public.is_admin());

-- La familia no puede cambiar estado de intervención ni fechas
create or replace function public.protect_child_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then
      new.status := 'entrevista';
      new.intervention_start := null;
      new.intervention_weeks := 6;
      new.pathology_range := null;
    end if;
    return new;
  end if;
  if not public.is_admin() and (
       new.status is distinct from old.status
    or new.intervention_start is distinct from old.intervention_start
    or new.intervention_weeks is distinct from old.intervention_weeks
    or new.pathology_range is distinct from old.pathology_range
    or new.family_id is distinct from old.family_id) then
    raise exception 'Solo la administradora puede modificar el estado de la intervención';
  end if;
  return new;
end; $$;
create trigger protect_child_status before insert or update on public.children
  for each row execute function public.protect_child_status();

-- Citas
create policy "citas lectura" on public.appointments for select
  using (family_id = auth.uid() or public.is_admin());
create policy "citas solicitud" on public.appointments for insert
  with check ((family_id = auth.uid() and status = 'solicitada') or public.is_admin());
create policy "citas edición" on public.appointments for update
  using (family_id = auth.uid() or public.is_admin());
create policy "citas borrado admin" on public.appointments for delete
  using (public.is_admin());

-- Las familias solo pueden cancelar o reprogramar su solicitud, no confirmarla
create or replace function public.protect_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.status not in ('solicitada', 'cancelada') then
      raise exception 'Solo la administradora puede confirmar citas';
    end if;
    if new.status = 'solicitada' and old.status <> 'solicitada' and new.starts_at = old.starts_at then
      raise exception 'Cambio de estado no permitido';
    end if;
    new.admin_notes := old.admin_notes;
    new.meeting_link := old.meeting_link;
  end if;
  return new;
end; $$;
create trigger protect_appointment before update on public.appointments
  for each row execute function public.protect_appointment();

-- Solicitudes de intervención
create policy "solicitudes lectura" on public.intervention_requests for select
  using (family_id = auth.uid() or public.is_admin());
create policy "solicitudes alta" on public.intervention_requests for insert
  with check ((family_id = auth.uid() and public.owns_child(child_id) and status = 'pendiente') or public.is_admin());
create policy "solicitudes admin" on public.intervention_requests for update
  using (public.is_admin());

-- Ficha de sueño: solo admin
create policy "ficha admin" on public.sleep_sheets for all
  using (public.is_admin()) with check (public.is_admin());

-- Histórico de patologías: familia (con suscripción activa) y admin
create policy "patologías lectura" on public.pathology_histories for select
  using (public.owns_child(child_id) or public.is_admin());
create policy "patologías alta" on public.pathology_histories for insert
  with check ((public.owns_child(child_id) and public.has_active_subscription(auth.uid())) or public.is_admin());
create policy "patologías edición" on public.pathology_histories for update
  using ((public.owns_child(child_id) and public.has_active_subscription(auth.uid())) or public.is_admin());

-- Diarios de sueño
create policy "diarios lectura" on public.sleep_diaries for select
  using (public.owns_child(child_id) or public.is_admin());
create policy "diarios alta" on public.sleep_diaries for insert
  with check ((public.owns_child(child_id) and public.has_active_subscription(auth.uid())) or public.is_admin());
create policy "diarios edición" on public.sleep_diaries for update
  using ((public.owns_child(child_id) and public.has_active_subscription(auth.uid())) or public.is_admin());

-- Lecturas de documentos
create policy "lecturas propias" on public.document_reads for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Plan de sueño: la familia lee el plan publicado; admin lo gestiona
create policy "plan lectura" on public.sleep_plans for select
  using ((public.owns_child(child_id) and published) or public.is_admin());
create policy "plan admin" on public.sleep_plans for all
  using (public.is_admin()) with check (public.is_admin());
create policy "versiones plan lectura" on public.sleep_plan_versions for select
  using (public.owns_child(child_id) or public.is_admin());
create policy "versiones plan admin" on public.sleep_plan_versions for all
  using (public.is_admin()) with check (public.is_admin());

-- Resúmenes de sesión: familia lee los enviados y marca como leídos
create policy "resúmenes lectura" on public.session_summaries for select
  using ((public.owns_child(child_id) and sent) or public.is_admin());
create policy "resúmenes admin" on public.session_summaries for all
  using (public.is_admin()) with check (public.is_admin());
create policy "resúmenes marcar leído" on public.session_summaries for update
  using (public.owns_child(child_id) and sent);

-- La familia solo puede marcar el resumen como leído, no cambiar su contenido
create or replace function public.protect_summary()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.title := old.title;
    new.content := old.content;
    new.sent := old.sent;
    new.child_id := old.child_id;
    new.appointment_id := old.appointment_id;
    new.week_number := old.week_number;
  end if;
  return new;
end; $$;
create trigger protect_summary before update on public.session_summaries
  for each row execute function public.protect_summary();

-- La familia solo puede marcar avisos como leídos
create or replace function public.protect_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.title := old.title;
    new.body := old.body;
    new.link := old.link;
    new.user_id := old.user_id;
  end if;
  return new;
end; $$;
create trigger protect_notification before update on public.notifications
  for each row execute function public.protect_notification();

-- Tareas de administración
create policy "tareas admin" on public.admin_tasks for all
  using (public.is_admin()) with check (public.is_admin());

-- Notificaciones
create policy "avisos propios" on public.notifications for select
  using (user_id = auth.uid());
create policy "avisos marcar leído" on public.notifications for update
  using (user_id = auth.uid());
create policy "avisos admin" on public.notifications for insert
  with check (public.is_admin());

-- =====================================================================
-- Notificaciones automáticas + push (Expo Push API vía pg_net)
-- =====================================================================
create or replace function public.notify_user(uid uuid, n_title text, n_body text, n_link text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  token text;
begin
  insert into public.notifications (user_id, title, body, link) values (uid, n_title, n_body, n_link);
  select push_token into token from public.profiles where id = uid;
  if token is not null and token like 'ExponentPushToken%' then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'to', token,
        'title', n_title,
        'body', n_body,
        'sound', 'default',
        'channelId', 'avisos',
        'data', jsonb_build_object('link', n_link)
      )
    );
  end if;
exception when others then
  -- un fallo en el push no debe bloquear la operación principal
  raise warning 'notify_user: %', sqlerrm;
end;
$$;

create or replace function public.notify_admins(n_title text, n_body text, n_link text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  for r in select id from public.profiles where role = 'admin' loop
    perform public.notify_user(r.id, n_title, n_body, n_link);
  end loop;
end;
$$;

-- Citas
create or replace function public.on_appointment_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  label text;
  fecha text;
  cname text;
begin
  label := case new.kind when 'entrevista_inicial' then 'Entrevista inicial' else 'Evaluación semanal' end;
  fecha := to_char(new.starts_at at time zone 'Europe/Madrid', 'DD/MM/YYYY "a las" HH24:MI');
  select name into cname from public.children where id = new.child_id;
  if tg_op = 'INSERT' and new.status = 'solicitada' then
    perform public.notify_admins('Nueva solicitud de cita',
      label || coalesce(' de ' || cname, '') || ' · ' || fecha, '/admin/agenda');
  elsif tg_op = 'INSERT' and new.status = 'confirmada' then
    perform public.notify_user(new.family_id, 'Nueva cita agendada 🌙', label || ' el ' || fecha, '/citas');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'confirmada' then
      perform public.notify_user(new.family_id, 'Cita confirmada 🌙', label || ' el ' || fecha, '/citas');
    elsif new.status = 'rechazada' then
      perform public.notify_user(new.family_id, 'Cita no disponible',
        label || ' del ' || fecha || '. Por favor, solicita otro horario.', '/citas');
    elsif new.status = 'cancelada' and public.is_admin() then
      perform public.notify_user(new.family_id, 'Cita cancelada', label || ' del ' || fecha, '/citas');
    elsif new.status = 'cancelada' then
      perform public.notify_admins('Cita cancelada por la familia', label || coalesce(' de ' || cname, '') || ' · ' || fecha, '/admin/agenda');
    end if;
  elsif tg_op = 'UPDATE' and new.starts_at <> old.starts_at and new.status = 'confirmada' then
    perform public.notify_user(new.family_id, 'Cita reprogramada', label || ' ahora el ' || fecha, '/citas');
  end if;
  return new;
end; $$;
create trigger appointment_notify after insert or update on public.appointments
  for each row execute function public.on_appointment_change();

-- Solicitudes de intervención
create or replace function public.on_intervention_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare cname text;
begin
  select name into cname from public.children where id = new.child_id;
  if tg_op = 'INSERT' then
    perform public.notify_admins('Solicitud de intervención', 'La familia de ' || cname || ' quiere comenzar la intervención', '/admin/nino/' || new.child_id);
  elsif new.status is distinct from old.status and new.status = 'aceptada' then
    perform public.notify_user(new.family_id, '¡Comenzamos! ✨',
      'Ya tenéis disponibles los documentos de ' || cname || ' en Mi espacio', '/mi-espacio');
  elsif new.status is distinct from old.status and new.status = 'rechazada' then
    perform public.notify_user(new.family_id, 'Solicitud de intervención',
      'Revisa tu correo o contacta con nosotras en desayunoconchupetes@gmail.com', '/mi-espacio');
  end if;
  return new;
end; $$;
create trigger intervention_request_notify after insert or update on public.intervention_requests
  for each row execute function public.on_intervention_request();

-- Diario enviado
create or replace function public.on_diary_submitted()
returns trigger language plpgsql security definer set search_path = public as $$
declare cname text;
begin
  if new.submitted and (tg_op = 'INSERT' or not old.submitted) then
    select name into cname from public.children where id = new.child_id;
    perform public.notify_admins('Diario de sueño recibido',
      cname || ' · semana ' || new.week_number, '/admin/nino/' || new.child_id);
  end if;
  return new;
end; $$;
create trigger diary_notify after insert or update on public.sleep_diaries
  for each row execute function public.on_diary_submitted();

-- Histórico enviado
create or replace function public.on_pathology_submitted()
returns trigger language plpgsql security definer set search_path = public as $$
declare cname text;
begin
  if new.submitted and (tg_op = 'INSERT' or not old.submitted) then
    select name into cname from public.children where id = new.child_id;
    perform public.notify_admins('Histórico de patologías recibido', cname, '/admin/nino/' || new.child_id);
  end if;
  return new;
end; $$;
create trigger pathology_notify after insert or update on public.pathology_histories
  for each row execute function public.on_pathology_submitted();

-- Plan de sueño publicado o actualizado
create or replace function public.on_plan_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fam uuid;
  cname text;
begin
  if new.published then
    select family_id, name into fam, cname from public.children where id = new.child_id;
    if tg_op = 'INSERT' or not old.published then
      perform public.notify_user(fam, 'Plan de sueño disponible 🌙',
        'Ya podéis consultar el plan de ' || cname || ' y activar los recordatorios', '/plan');
    elsif new.version <> old.version then
      perform public.notify_user(fam, 'Plan de sueño actualizado',
        'Hemos ajustado el plan de ' || cname || '. Abre la app para actualizar tus recordatorios', '/plan');
    end if;
  end if;
  return new;
end; $$;
create trigger plan_notify after insert or update on public.sleep_plans
  for each row execute function public.on_plan_change();

-- Resumen de sesión enviado
create or replace function public.on_summary_sent()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  fam uuid;
  cname text;
begin
  if new.sent and (tg_op = 'INSERT' or not old.sent) then
    select family_id, name into fam, cname from public.children where id = new.child_id;
    perform public.notify_user(fam, 'Nuevo resumen de sesión', new.title || ' · ' || cname, '/mi-espacio');
  end if;
  return new;
end; $$;
create trigger summary_notify after insert or update on public.session_summaries
  for each row execute function public.on_summary_sent();

-- Suscripción
create or replace function public.on_subscription_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.status is distinct from old.status and new.status = 'activa' then
    perform public.notify_user(new.family_id, 'Suscripción activa', 'Tu servicio de asesoría de sueño está activo 💤', '/perfil');
  end if;
  return new;
end; $$;
create trigger subscription_change before update on public.subscriptions
  for each row execute function public.on_subscription_change();

-- =====================================================================
-- Realtime para refrescar la app al instante
-- =====================================================================
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.sleep_plans;
alter publication supabase_realtime add table public.appointments;
