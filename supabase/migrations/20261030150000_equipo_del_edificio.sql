-- El equipo del edificio, para la administración (30/10/2026).
--
-- Pedidos del cliente (Para Claude 190 y 191): en «Gestión y Renta Corta» la
-- administración consulta dos listados:
--   · «Directorio Oficina y Administración»: administradores y
--     coadministradores, con sus datos y los permisos que tienen;
--   · «Guardias»: los guardias, con sus datos, su horario y si ahora mismo
--     se les puede llamar o escribir (de turno y con el permiso).
--
-- Una sola función para los dos, y solo para la administración de ese
-- edificio. Solo aditiva.

create or replace function public.equipo_del_edificio(p_condominio_id uuid)
 returns table(
   membresia_id uuid,
   usuario_id uuid,
   rol public.rol_condominio,
   nombre text,
   correo text,
   telefono text,
   codigo_pais text,
   permisos jsonb,
   horario text,
   de_turno boolean,
   recibe_llamadas boolean,
   recibe_chat boolean
 )
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if not public.es_admin_condominio(p_condominio_id) then
    raise exception 'Solo la administración del edificio ve su equipo';
  end if;

  return query
  select
    m.id,
    m.usuario_id,
    m.rol,
    coalesce(
      nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
      m.nombre,
      'Sin nombre'
    ),
    u.email::text,
    coalesce(nullif(p.telefono, ''), m.telefono),
    coalesce(nullif(p.codigo_pais, ''), m.codigo_pais),
    coalesce(m.permisos, '{}'::jsonb),
    (
      select string_agg(
        (array['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'])[t.dia_semana + 1]
          || ' ' || to_char(t.hora_inicio, 'HH24:MI') || '–' || to_char(t.hora_fin, 'HH24:MI'),
        ' · ' order by t.dia_semana, t.hora_inicio)
      from public.turno_guardia t
      where t.membresia_id = m.id
    ),
    case when m.rol = 'guardia'
         then m.usuario_id is not null and public.guardia_atiende_ahora(p_condominio_id, m.usuario_id)
         else null end,
    case when m.rol = 'guardia'
         then (m.permisos ->> 'llamadas') = 'true'
              and m.usuario_id is not null and public.quiere_llamadas_app(m.usuario_id)
         else null end,
    case when m.rol = 'guardia'
         then (m.permisos ->> 'chat') = 'true'
         else null end
  from public.membresia_condominio m
  left join public.perfil p on p.id = m.usuario_id
  left join auth.users u on u.id = m.usuario_id
  where m.condominio_id = p_condominio_id
    and m.activo
    and m.rol in ('administrador', 'coadministrador', 'guardia')
  order by case m.rol when 'administrador' then 0 when 'coadministrador' then 1 else 2 end, 4;
end;
$function$;

comment on function public.equipo_del_edificio(uuid) is
  'Administradores, coadministradores y guardias del edificio con sus datos, permisos y, de los guardias, su horario y si ahora se les puede llamar o escribir. Solo para la administración (30/10/2026).';

revoke execute on function public.equipo_del_edificio(uuid) from public, anon;
grant execute on function public.equipo_del_edificio(uuid) to authenticated, service_role;
