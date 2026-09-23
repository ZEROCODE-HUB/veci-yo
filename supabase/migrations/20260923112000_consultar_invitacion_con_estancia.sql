-- ----------------------------------------------------------------------------
-- La consulta de una invitación devuelve también la estancia
-- ----------------------------------------------------------------------------
-- `consultar_invitacion` es lo que ve quien recibe el enlace, antes de tener
-- cuenta: le dice de qué condominio y qué vivienda le hablan, y si el enlace
-- sigue vigente. Desde 20260922200000 una invitación de huésped lleva las
-- fechas de la estancia, y esa es justamente la información que la persona
-- quiere confirmar antes de aceptar: "del 3 al 7, ¿no?".
--
-- El tipo de retorno cambia, asi que hay que eliminarla antes: `create or
-- replace` no puede alterar las columnas de un `returns table`.

drop function if exists public.consultar_invitacion(text);

create or replace function public.consultar_invitacion(p_token text)
returns table (
  condominio      text,
  unidad          text,
  rol             text,
  correo          text,
  nombre          text,
  expira_en       timestamptz,
  vigente         boolean,
  vigente_desde   date,
  vigente_hasta   date
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    c.nombre,
    u.codigo,
    coalesce(i.rol_unidad::text, i.rol_condominio::text),
    i.correo,
    i.nombre,
    i.expira_en,
    (i.estado = 'pendiente' and i.expira_en > now()),
    i.vigente_desde,
    i.vigente_hasta
  from public.invitacion i
  join public.condominio c on c.id = i.condominio_id
  left join public.unidad u on u.id = i.unidad_id
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

comment on function public.consultar_invitacion(text) is
  'Lo que ve quien recibe el enlace antes de tener cuenta. Solo responde a quien tiene el token; el hash es lo unico guardado.';

revoke all on function public.consultar_invitacion(text) from public;
grant execute on function public.consultar_invitacion(text) to anon, authenticated;
