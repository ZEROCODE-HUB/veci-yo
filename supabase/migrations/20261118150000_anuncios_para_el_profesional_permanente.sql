-- ============================================================================
-- Anuncios para el profesional permanente (18/11/2026, pedido del cliente)
-- ============================================================================
-- «Al crear un anuncio, agregar el grupo de Profesional Permanente». Una
-- casilla más en «Dirigido a» (`para_trabajadores`): lo ven y les llega el
-- aviso a los profesionales permanentes con cuenta de las viviendas del
-- edificio. No votan: no son de la vivienda (el voto mira membresia_unidad).
--
-- Cambia la regla del 17/11/2026 («el trabajador no ve anuncios»), a pedido
-- del cliente. Solo aditiva: una columna, una función, una política nueva y
-- tres funciones con su cuerpo de hoy más el profesional.
--
-- Ninguna función devuelve `publicacion` como tipo, así que la columna nueva
-- no rompe ninguna.

alter table public.publicacion
  add column if not exists para_trabajadores boolean not null default false;
comment on column public.publicacion.para_trabajadores is
  'Dirigido también a los profesionales permanentes con cuenta de las viviendas del edificio (18/11/2026).';

create or replace function public.es_trabajador_con_app_en(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select auth.uid() is not null and exists (
    select 1 from public.trabajador_de_la_vivienda t
    join public.unidad u on u.id = t.unidad_id and u.deleted_at is null
    where u.condominio_id = p_condominio_id
      and t.usuario_id = auth.uid() and t.con_app and t.deleted_at is null
  );
$$;
comment on function public.es_trabajador_con_app_en(uuid) is
  'Si quien llama es profesional permanente con cuenta de alguna vivienda de ese edificio (18/11/2026).';
revoke execute on function public.es_trabajador_con_app_en(uuid) from public, anon;
grant execute on function public.es_trabajador_con_app_en(uuid) to authenticated, service_role;

-- Se suma a `publicacion_lectura`.
drop policy if exists publicacion_lectura_del_trabajador on public.publicacion;
create policy publicacion_lectura_del_trabajador on public.publicacion
  for select to authenticated
  using (
    para_trabajadores
    and public.ya_es_su_dia(publicada_desde, condominio_id)
    and public.es_trabajador_con_app_en(condominio_id)
  );

CREATE OR REPLACE FUNCTION public.puede_ver_publicacion(p_publicacion_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select coalesce((
    select public.puede_ver_publicacion_fila(
      p.condominio_id, p.para_propietarios, p.para_residentes,
      p.para_huespedes, p.para_porteria, p.publicada_desde)
      -- El profesional permanente, si va para él (18/11/2026).
      or (p.para_trabajadores
          and public.ya_es_su_dia(p.publicada_desde, p.condominio_id)
          and public.es_trabajador_con_app_en(p.condominio_id))
    from public.publicacion p
    where p.id = p_publicacion_id and p.deleted_at is null
  ), false);
$function$;

CREATE OR REPLACE FUNCTION public.quien_alcanza_la_publicacion(p_publicacion_id uuid)
 RETURNS TABLE(usuario_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select mu.usuario_id
  from public.publicacion p
  join public.unidad u on u.condominio_id = p.condominio_id
  join public.membresia_unidad mu on mu.unidad_id = u.id
  where p.id = p_publicacion_id
    and mu.usuario_id is not null
    and mu.activo
    -- Sin cuenta no hay bandeja. Es el menor de edad que el propietario
    -- registra, que a propósito no entra a la plataforma.
    and mu.puede_acceder
    and (
      (p.para_propietarios and mu.rol = 'propietario')
      or (p.para_residentes and mu.es_residente and mu.rol <> 'huesped_temporal')
      or (p.para_huespedes and mu.rol = 'huesped_temporal'
          and (mu.vigente_hasta is null or mu.vigente_hasta >= public.hoy_en_el_edificio(p.condominio_id)))
    )
  union
  select mc.usuario_id
  from public.publicacion p
  join public.membresia_condominio mc on mc.condominio_id = p.condominio_id
  where p.id = p_publicacion_id
    and p.para_porteria
    and mc.rol = 'guardia'
    and mc.activo
    and mc.usuario_id is not null
  union
  -- El profesional permanente con cuenta (18/11/2026).
  select t.usuario_id
  from public.publicacion p
  join public.unidad u on u.condominio_id = p.condominio_id and u.deleted_at is null
  join public.trabajador_de_la_vivienda t on t.unidad_id = u.id
  where p.id = p_publicacion_id
    and p.para_trabajadores
    and t.con_app and t.deleted_at is null
    and t.usuario_id is not null;
$function$;

CREATE OR REPLACE FUNCTION public.avisar_de_la_publicacion(p_publicacion_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_pub      record;
  v_titulo   text;
  v_cuantos  integer := 0;
begin
  select p.id, p.condominio_id, p.tipo, p.titulo, p.creada_por,
         p.avisar, p.avisado_en, p.publicada_desde, p.deleted_at,
         p.para_propietarios, p.para_residentes, p.para_huespedes, p.para_porteria,
         p.para_trabajadores
    into v_pub
  from public.publicacion p
  where p.id = p_publicacion_id;

  if v_pub.id is null or v_pub.deleted_at is not null then
    return 0;
  end if;

  if not v_pub.avisar then
    return 0;
  end if;

  if not public.ya_es_su_dia(v_pub.publicada_desde, v_pub.condominio_id) then
    return 0;
  end if;

  if v_pub.avisado_en is not null then
    return 0;
  end if;

  v_titulo := case
    when v_pub.tipo = 'encuesta' then 'Nueva encuesta'
    else 'Nuevo anuncio'
  end;

  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id, audiencia)
  select q.usuario_id, v_pub.condominio_id, 'anuncio_publicado',
         v_titulo, v_pub.titulo, 'publicacion', v_pub.id,
         jsonb_build_object(
           'propietarios', coalesce(v_pub.para_propietarios, false),
           'residentes', coalesce(v_pub.para_residentes, false),
           'huespedes', coalesce(v_pub.para_huespedes, false),
           'porteria', coalesce(v_pub.para_porteria, false),
           'trabajadores', coalesce(v_pub.para_trabajadores, false))
  from public.quien_alcanza_la_publicacion(p_publicacion_id) q
  where (v_pub.creada_por is null or q.usuario_id <> v_pub.creada_por)
    and public.quiere_aviso(q.usuario_id, 'anuncio_publicado', 'app');

  get diagnostics v_cuantos = row_count;

  update public.publicacion set avisado_en = now() where id = p_publicacion_id;

  return v_cuantos;
end;
$function$;
