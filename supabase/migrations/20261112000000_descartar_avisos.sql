-- =====================================================================
-- Desayuno con Chupetes · Actualización 4
--  Cada persona (familia o administradora) puede descartar sus propios
--  avisos para que no se acumulen.
--
-- Cómo aplicarla: Supabase > SQL Editor > New query > pegar todo > Run
-- (se puede ejecutar más de una vez sin problema)
-- =====================================================================
drop policy if exists "avisos descartar" on public.notifications;
create policy "avisos descartar" on public.notifications for delete
  using (user_id = auth.uid());
