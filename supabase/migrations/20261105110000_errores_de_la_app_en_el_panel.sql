-- Los errores de la app en el panel del administrador de la app (05/11/2026).
--
-- Desde el 26/10/2026 la app anota en `error_de_la_app` los errores que
-- revientan una pantalla y los rastros de los pasos delicados (el escaneo del
-- documento, el cambio de rol). Nadie los leía salvo a mano con la clave de la
-- base: ocho escaneos fallidos del 04/11 estuvieron ahí sin que nadie lo viera
-- hasta que se preguntó.
--
-- El panel los ve **agrupados y sin decir de quién** (el alcance del rol de
-- plataforma, decidido por el cliente el 02/10/2026: nada de una persona
-- concreta). Por eso estas funciones devuelven cuántas veces, a cuántas cuentas,
-- en qué versiones y sistemas, y el mensaje técnico; nunca `usuario_id`.
--
-- Solo aditivo: dos funciones de lectura.

create or replace function public.panel_errores_de_la_app(
  p_dias integer default 7,
  p_tipo public.tipo_error_de_la_app default 'error'
)
returns table (
  donde text,
  veces integer,
  cuentas integer,
  ultima_vez timestamptz,
  ultimo_mensaje text,
  versiones text[],
  plataformas text[]
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Esto es del panel de la plataforma';
  end if;

  return query
  select e.donde,
         count(*)::int,
         count(distinct e.usuario_id)::int,
         max(e.created_at),
         (array_agg(left(e.mensaje, 300) order by e.created_at desc))[1],
         array_agg(distinct e.version) filter (where e.version is not null),
         array_agg(distinct e.plataforma) filter (where e.plataforma is not null)
  from public.error_de_la_app e
  where e.tipo = p_tipo
    and e.created_at > now() - make_interval(days => least(greatest(coalesce(p_dias, 7), 1), 90))
  group by e.donde
  order by max(e.created_at) desc;
end;
$$;

comment on function public.panel_errores_de_la_app(integer, public.tipo_error_de_la_app) is
  'Los errores (o rastros) de la app de los últimos días, agrupados por dónde pasaron, sin decir de quién (05/11/2026).';

create or replace function public.panel_errores_de_un_sitio(
  p_donde text,
  p_dias integer default 7,
  p_tipo public.tipo_error_de_la_app default 'error'
)
returns table (
  creado_en timestamptz,
  mensaje text,
  detalle text,
  version text,
  plataforma text
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Esto es del panel de la plataforma';
  end if;

  return query
  select e.created_at, left(e.mensaje, 1000), left(e.detalle, 2000), e.version, e.plataforma
  from public.error_de_la_app e
  where e.donde = p_donde
    and e.tipo = p_tipo
    and e.created_at > now() - make_interval(days => least(greatest(coalesce(p_dias, 7), 1), 90))
  order by e.created_at desc
  limit 50;
end;
$$;

comment on function public.panel_errores_de_un_sitio(text, integer, public.tipo_error_de_la_app) is
  'Las últimas veces que pasó un error (o rastro) en un sitio de la app, sin decir de quién (05/11/2026).';

revoke all on function public.panel_errores_de_la_app(integer, public.tipo_error_de_la_app) from public, anon;
revoke all on function public.panel_errores_de_un_sitio(text, integer, public.tipo_error_de_la_app) from public, anon;
grant execute on function public.panel_errores_de_la_app(integer, public.tipo_error_de_la_app) to authenticated;
grant execute on function public.panel_errores_de_un_sitio(text, integer, public.tipo_error_de_la_app) to authenticated;
