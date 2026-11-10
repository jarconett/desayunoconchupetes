-- =====================================================================
-- Desayuno con Chupetes · Actualización 3
--  1. Fecha de inicio de la intervención y suscripción siempre sincronizadas
--     (se cambie desde «Suscripción del servicio» o desde la ficha del peque)
--  2. Al cambiar la fecha se recalculan las semanas de los diarios
--     y se avisa a la familia
--  3. Seguridad: las funciones de avisos solo se pueden usar internamente
--
-- Cómo aplicarla: Supabase > SQL Editor > New query > pegar todo > Run
-- (se puede ejecutar más de una vez sin problema)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1a. Ficha del peque → diarios, suscripción y aviso a la familia
-- ---------------------------------------------------------------------
create or replace function public.sync_child_intervention_dates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.intervention_start is null then
    return new;
  end if;

  if new.intervention_start is distinct from old.intervention_start then
    -- Cada semana del diario empieza el lunes de su semana de intervención
    update public.sleep_diaries d
       set week_start = date_trunc('week', new.intervention_start + (d.week_number - 1) * 7)::date
     where d.child_id = new.id;

    -- Solo si se cambia una fecha que ya existía (al empezar ya llega «¡Comenzamos!»)
    if new.status = 'intervencion' and old.status = 'intervencion' and old.intervention_start is not null then
      perform public.notify_user(
        new.family_id,
        '📅 Fecha de la intervención actualizada',
        'La intervención de ' || new.name || ' empieza el ' || to_char(new.intervention_start, 'DD/MM/YYYY') || '.',
        '/mi-espacio'
      );
    end if;
  end if;

  -- Suscripción de la familia = del primer inicio al último fin de sus peques en intervención
  -- (pg_trigger_depth evita el rebote con el trigger de la suscripción)
  if pg_trigger_depth() = 1
     and new.status = 'intervencion'
     and (new.intervention_start is distinct from old.intervention_start
          or new.intervention_weeks is distinct from old.intervention_weeks
          or new.status is distinct from old.status) then
    update public.subscriptions s
       set start_date = x.inicio,
           end_date = x.fin,
           updated_at = now()
      from (
        select min(c.intervention_start) as inicio,
               max(c.intervention_start + c.intervention_weeks * 7 + 7) as fin
          from public.children c
         where c.family_id = new.family_id
           and c.status = 'intervencion'
           and c.intervention_start is not null
      ) x
     where s.family_id = new.family_id
       and x.inicio is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_child_intervention_dates on public.children;
create trigger sync_child_intervention_dates
  after update of intervention_start, intervention_weeks, status on public.children
  for each row execute function public.sync_child_intervention_dates();

-- ---------------------------------------------------------------------
-- 1b. Suscripción del servicio → inicio de la intervención de sus peques
-- ---------------------------------------------------------------------
create or replace function public.sync_subscription_start()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() = 1
     and new.start_date is not null
     and new.start_date is distinct from old.start_date then
    update public.children
       set intervention_start = new.start_date
     where family_id = new.family_id
       and status = 'intervencion'
       and intervention_start is distinct from new.start_date;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_subscription_start on public.subscriptions;
create trigger sync_subscription_start
  after update of start_date on public.subscriptions
  for each row execute function public.sync_subscription_start();

-- ---------------------------------------------------------------------
-- 1c. Corregir los datos que ya estén desincronizados:
--     familias con un único peque en intervención → la fecha de la
--     suscripción manda (es la que se ha editado en estos casos)
-- ---------------------------------------------------------------------
update public.children c
   set intervention_start = s.start_date
  from public.subscriptions s
 where s.family_id = c.family_id
   and c.status = 'intervencion'
   and s.start_date is not null
   and c.intervention_start is distinct from s.start_date
   and (select count(*) from public.children c2
         where c2.family_id = c.family_id and c2.status = 'intervencion') = 1;

-- ---------------------------------------------------------------------
-- 2. Tiempo real: la app de la familia se refresca al cambiar sus peques
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'children'
  ) then
    alter publication supabase_realtime add table public.children;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Seguridad: notify_user y notify_admins solo desde la base de datos
--    (antes cualquier usuario podía llamarlas y enviar avisos a otros)
-- ---------------------------------------------------------------------
revoke execute on function public.notify_user(uuid, text, text, text) from public, anon, authenticated;
revoke execute on function public.notify_admins(text, text, text) from public, anon, authenticated;
