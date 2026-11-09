-- =====================================================================
-- Desayuno con Chupetes · Actualización 2
--  1. Consentimientos (política de cookies y protección de datos)
--  2. Avisos: el aviso dentro de la app se guarda aunque falle el push
--  3. Función para enviarse una notificación de prueba
--
-- Cómo aplicarla: Supabase > SQL Editor > New query > pegar todo > Run
-- (se puede ejecutar más de una vez sin problema)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Consentimientos
-- ---------------------------------------------------------------------
create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid references public.children (id) on delete cascade,
  kind text not null check (kind in ('cookies', 'proteccion_datos')),
  version text not null,
  accepted boolean not null default true,
  signer_name text,
  signer_dni text,
  platform text,
  created_at timestamptz not null default now()
);
create index if not exists consents_user_idx on public.consents (user_id, kind);
create index if not exists consents_child_idx on public.consents (child_id);

alter table public.consents enable row level security;

drop policy if exists "consentimientos lectura" on public.consents;
create policy "consentimientos lectura" on public.consents for select
  using (user_id = auth.uid() or public.is_admin());

-- Cada persona solo registra sus propios consentimientos (y de sus peques).
-- No hay política de update/delete: el registro es un justificante.
drop policy if exists "consentimientos alta" on public.consents;
create policy "consentimientos alta" on public.consents for insert
  with check (user_id = auth.uid() and (child_id is null or public.owns_child(child_id)));

-- La solicitud de intervención exige haber aceptado la protección de datos
create or replace function public.require_data_consent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.consents
    where child_id = new.child_id and kind = 'proteccion_datos' and accepted
  ) then
    raise exception 'Para solicitar la intervención hay que aceptar antes el documento de protección de datos';
  end if;
  return new;
end;
$$;
drop trigger if exists require_data_consent on public.intervention_requests;
create trigger require_data_consent before insert on public.intervention_requests
  for each row execute function public.require_data_consent();

-- ---------------------------------------------------------------------
-- 2. Avisos: guardar siempre el aviso; el push va aparte
--    (antes, si pg_net fallaba, se perdía también el aviso de la app)
-- ---------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

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
  if token is null or token not like 'ExponentPushToken%' then
    return;
  end if;

  begin
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'to', token,
        'title', n_title,
        'body', n_body,
        'sound', 'default',
        'priority', 'high',
        'channelId', 'avisos',
        'data', jsonb_build_object('link', n_link)
      )
    );
  exception when others then
    -- un fallo en el push no debe bloquear la operación ni borrar el aviso
    raise warning 'notify_user (push): %', sqlerrm;
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Notificación de prueba (botón "Probar notificaciones" de la app)
-- ---------------------------------------------------------------------
create or replace function public.send_test_notification()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  token text;
begin
  if auth.uid() is null then
    raise exception 'Sin sesión';
  end if;
  select push_token into token from public.profiles where id = auth.uid();
  perform public.notify_user(
    auth.uid(),
    '🌙 Notificación de prueba',
    'Si ves este aviso en la barra del móvil, las notificaciones funcionan correctamente.',
    null
  );
  return case when token like 'ExponentPushToken%' then 'push_enviado' else 'sin_token' end;
end;
$$;
grant execute on function public.send_test_notification() to authenticated;
