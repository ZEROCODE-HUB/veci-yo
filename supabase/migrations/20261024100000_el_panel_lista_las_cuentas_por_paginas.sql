-- El panel lista las cuentas por páginas (24/10/2026).
--
-- Lo pidió el cliente: «en usuarios debería haber directo la lista con una
-- paginación, no quiero buscar sí o sí». `panel_buscar_usuarios` exige tres
-- letras; esta lista todas, de la más nueva a la más antigua, y filtra si se
-- escribe algo (correo o nombre). Devuelve en cada fila cuántas hay en total,
-- para que la pantalla diga «página 2 de 5».
--
-- Lo que se ve de cada cuenta es lo mismo que en la búsqueda: nombre, correo,
-- estado y en qué edificios está con qué rol (límite del 02/10/2026). Mira
-- cualquiera del equipo. Aditiva: la búsqueda de antes se queda para las
-- versiones de la app que aún la llaman.

create or replace function public.panel_listar_usuarios(
  p_texto text default null,
  p_pagina int default 1,
  p_por_pagina int default 20
)
returns table (
  usuario_id uuid, nombre text, correo text, creada_en timestamptz,
  ultimo_ingreso timestamptz, correo_confirmado boolean, bloqueada boolean,
  edificios jsonb, rol_plataforma text, total bigint
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_q text := lower(btrim(coalesce(p_texto, '')));
  v_por int := least(greatest(coalesce(p_por_pagina, 20), 1), 100);
  v_pagina int := greatest(coalesce(p_pagina, 1), 1);
begin
  if not public.es_staff_plataforma() then
    raise exception 'Solo el equipo de la plataforma ve las cuentas';
  end if;

  return query
  with filtradas as (
    select u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at, u.banned_until,
           coalesce(nullif(trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''), 'Sin nombre') as nombre
    from auth.users u
    left join public.perfil p on p.id = u.id
    where v_q = ''
       or lower(u.email) like '%' || v_q || '%'
       or lower(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')) like '%' || v_q || '%'
  )
  select f.id,
         f.nombre,
         f.email::text,
         f.created_at,
         f.last_sign_in_at,
         f.email_confirmed_at is not null,
         coalesce(f.banned_until > now(), false),
         -- En qué edificios está y con qué rol. Nada más de su vida en ellos.
         coalesce((
           select jsonb_agg(distinct jsonb_build_object('edificio', x.edificio, 'rol', x.rol))
           from (
             select c.nombre as edificio, m.rol::text as rol
             from public.membresia_unidad m
             join public.unidad un on un.id = m.unidad_id
             join public.condominio c on c.id = un.condominio_id
             where m.usuario_id = f.id and m.activo
             union all
             select c.nombre, mc.rol::text
             from public.membresia_condominio mc
             join public.condominio c on c.id = mc.condominio_id
             where mc.usuario_id = f.id and mc.activo
           ) x
         ), '[]'::jsonb),
         (select sp.rol::text from public.staff_plataforma sp where sp.usuario_id = f.id and sp.activo),
         count(*) over ()
  from filtradas f
  order by f.created_at desc
  limit v_por offset (v_pagina - 1) * v_por;
end;
$$;

comment on function public.panel_listar_usuarios(text, int, int) is
  'Panel: las cuentas de la app por páginas, de la más nueva a la más antigua, filtradas por correo o nombre si se escribe algo; cada fila trae el total (equipo).';

revoke all on function public.panel_listar_usuarios(text, int, int) from public, anon;
grant execute on function public.panel_listar_usuarios(text, int, int) to authenticated, service_role;
