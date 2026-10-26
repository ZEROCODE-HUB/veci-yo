-- ----------------------------------------------------------------------------
-- El QR de una estancia dice cuándo es, aunque la portería no la vea todavía
-- (26/10/2026)
-- ----------------------------------------------------------------------------
-- El cliente escaneó un QR en portería y «no me llevó a la reserva». La
-- estancia existía, pero era del 29/10: la portería ve hoy, mañana y a quien
-- está dentro (09/10/2026), así que `estancia_por_codigo` la encontraba, la
-- pantalla de Visitas no la tenía en su lista y no pasaba nada, sin un aviso.
--
-- `buscar_estancia_por_codigo` devuelve además si la portería la puede abrir
-- ya y, si no, la vivienda y las fechas: lo justo para decirle al guardia
-- «es de la 102, del 29/10 al 01/11». No abre nada que la ventana cierre: quien
-- trae el QR en la mano es el propio huésped.
--
-- Solo aditiva: `estancia_por_codigo` se queda como está.

create or replace function public.buscar_estancia_por_codigo(p_codigo text)
returns table (
  visita_id   uuid,
  la_ve       boolean,
  unidad      text,
  fecha_desde date,
  fecha_hasta date,
  estado      public.estado_visita
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select v.id,
         public.puede_ver_visita(v.id),
         u.codigo,
         v.fecha_desde,
         v.fecha_hasta,
         v.estado
  from public.visita v
  left join public.unidad u on u.id = v.unidad_id
  where v.codigo_acceso = upper(btrim(regexp_replace(coalesce(p_codigo, ''), '^VECIYO:', '', 'i')))
    and public.es_guardia_de_condominio(v.condominio_id)
  order by (v.estado in ('cancelada', 'finalizada')), v.fecha_desde desc nulls last
  limit 1;
$function$;

comment on function public.buscar_estancia_por_codigo(text) is
  'El QR o el código de una estancia, para la portería de su edificio: la estancia, si ya la puede abrir (ventana de portería) y, si no, la vivienda, las fechas y el estado para decírselo.';
