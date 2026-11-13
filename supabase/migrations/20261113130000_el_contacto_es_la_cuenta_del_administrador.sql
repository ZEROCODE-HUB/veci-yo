-- El contacto de la administración sale de la cuenta del administrador
-- (13/11/2026, decidido con el cliente).
--
-- Hasta hoy el teléfono y el correo de contacto eran datos del edificio que la
-- administración escribía a mano en Arquitectura, sin relación con su cuenta:
-- si cambiaba su número o el edificio cambiaba de administración, el dato
-- viejo se quedaba. Desde hoy son los de la cuenta del administrador principal
-- (el más antiguo activo): su teléfono del perfil y el correo con el que entra.
-- El horario de atención se retira de la app.
--
-- El correo vive en `auth.users`, que los vecinos no pueden leer; por eso va
-- en una función que solo responde a quien es del edificio. Solo aditiva:
-- función nueva; las columnas `condominio.telefono/email/horario_atencion`
-- quedan, sin uso en la app.

create or replace function public.contacto_de_la_administracion(p_condominio_id uuid)
returns table (nombre text, telefono text, codigo_pais text, email text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    nullif(btrim(concat_ws(' ', p.nombre, p.apellido)), ''),
    coalesce(nullif(btrim(p.telefono), ''), nullif(btrim(mc.telefono), '')),
    case when nullif(btrim(p.telefono), '') is not null then p.codigo_pais else mc.codigo_pais end,
    u.email::text
  from public.membresia_condominio mc
  left join public.perfil p on p.id = mc.usuario_id
  left join auth.users u on u.id = mc.usuario_id
  where mc.condominio_id = p_condominio_id
    and mc.rol = 'administrador'
    and mc.activo
    and mc.usuario_id is not null
    and (public.es_miembro_condominio(p_condominio_id)
         or public.es_personal_condominio(p_condominio_id))
  order by mc.created_at
  limit 1;
$$;

revoke execute on function public.contacto_de_la_administracion(uuid) from public, anon;
grant execute on function public.contacto_de_la_administracion(uuid) to authenticated, service_role;
comment on function public.contacto_de_la_administracion(uuid) is
  'Nombre, teléfono y correo de la cuenta del administrador principal del edificio, para sus vecinos y su personal (13/11/2026).';
