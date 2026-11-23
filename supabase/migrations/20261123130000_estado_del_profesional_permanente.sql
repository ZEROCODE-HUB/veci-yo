-- ============================================================================
-- En qué va cada profesional permanente (23/11/2026)
-- ============================================================================
-- El cliente, probando la 148: que «Reenviar invitación» se vaya cuando el
-- profesional ya creó su cuenta y entró, y manejarlo desde su visita en
-- Visitas («Editar privilegios», «Dar de baja»). Para eso la app necesita, por
-- cada profesional de la vivienda: su visita, sus permisos y en qué va:
--
--   sin_app        sin cuenta en la app (solo directorio)
--   invitado       se le mandó la invitación y todavía no creó su cuenta
--   cuenta_creada  ya tiene cuenta con ese correo, pero no ha aceptado
--   activo         entra con su cuenta
--
-- Solo para quien gestiona la vivienda: dice si un correo tiene cuenta, y eso
-- no se le cuenta a cualquiera. Aditivo: una función nueva.

create or replace function public.estado_de_trabajadores(p_unidad_id uuid)
returns table (
  id uuid,
  visita_id uuid,
  estado text,
  puede_crear_visitas boolean,
  puede_contestar_citofono boolean
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp', 'auth'
as $$
begin
  if not public.gestiona_trabajadores_de(p_unidad_id) then
    raise exception 'Solo quien gestiona la vivienda ve en qué va cada profesional';
  end if;
  return query
  select t.id, t.visita_id,
         case
           when t.usuario_id is not null then 'activo'
           when not t.con_app or t.correo_invitado is null then 'sin_app'
           when exists (select 1 from auth.users u
                         where lower(u.email) = lower(t.correo_invitado)
                           and u.email_confirmed_at is not null) then 'cuenta_creada'
           else 'invitado'
         end,
         t.puede_crear_visitas, t.puede_contestar_citofono
    from public.trabajador_de_la_vivienda t
   where t.unidad_id = p_unidad_id and t.deleted_at is null;
end;
$$;
comment on function public.estado_de_trabajadores(uuid) is
  'Por cada profesional permanente de la vivienda: su visita, sus permisos y en qué va (sin_app, invitado, cuenta_creada, activo). Solo quien la gestiona.';
revoke execute on function public.estado_de_trabajadores(uuid) from public, anon;
grant execute on function public.estado_de_trabajadores(uuid) to authenticated, service_role;
