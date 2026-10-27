-- ----------------------------------------------------------------------------
-- El Cuadro de Honor cuenta el mes en curso si la administración quiere
-- (27/10/2026)
-- ----------------------------------------------------------------------------
-- Hueco 53 del GSheet. El Cuadro de Honor cuenta desde el mes más reciente, y
-- en cuanto se crea un mes nuevo nadie lo ha pagado todavía: el cuadro salía
-- vacío hasta que se marcaban pagos. El cliente: «que sea configurable por el
-- administrador del edificio».
--
--   · `condominio.cuadro_honor_mes_en_curso`: lo elige la administración. Nulo
--     es «lo de la plataforma», el parámetro `cuadro_honor_mes_en_curso_por_defecto`
--     (apagado: solo cuentan los meses ya vencidos).
--   · Un mes está vencido cuando pasó su `vence_en` en el reloj del edificio;
--     sin fecha de vencimiento, cuando terminó el mes.
-- Solo aditiva.

insert into public.configuracion_plataforma
  (clave, valor, descripcion, tipo, valor_por_defecto, ambito, categoria, riesgo, es_publico)
values
  ('cuadro_honor_mes_en_curso_por_defecto', 'false',
   'Si el Cuadro de Honor cuenta también el mes en curso, en un edificio cuya administración no lo ha elegido. Apagado: solo los meses ya vencidos, para que el cuadro no salga vacío al empezar el mes.',
   'booleano', 'false', 'edificio', 'cuotas', 'bajo', false)
on conflict (clave) do nothing;

alter table public.condominio
  add column if not exists cuadro_honor_mes_en_curso boolean;

comment on column public.condominio.cuadro_honor_mes_en_curso is
  'Si el Cuadro de Honor cuenta el mes en curso (true) o solo los meses ya vencidos (false). Lo elige la administración; nulo: el parámetro cuadro_honor_mes_en_curso_por_defecto.';

create or replace function public.cuadro_honor_cuenta_mes_en_curso(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(
    (select c.cuadro_honor_mes_en_curso from public.condominio c where c.id = p_condominio_id),
    public.parametro_booleano('cuadro_honor_mes_en_curso_por_defecto', p_condominio_id),
    false
  );
$function$;

comment on function public.cuadro_honor_cuenta_mes_en_curso(uuid) is
  'Si el Cuadro de Honor de ese edificio cuenta el mes en curso: lo elegido por la administración o, si no eligió, el parámetro de la plataforma. Hueco 53.';

grant execute on function public.cuadro_honor_cuenta_mes_en_curso(uuid) to authenticated, service_role;

create or replace function public.guardar_cuadro_honor_mes_en_curso(p_condominio_id uuid, p_cuenta boolean)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if not public.es_admin_condominio(p_condominio_id) then
    raise exception 'Solo la administración decide cómo cuenta el Cuadro de Honor'
      using errcode = '42501';
  end if;

  update public.condominio
  set cuadro_honor_mes_en_curso = p_cuenta
  where id = p_condominio_id;
end;
$function$;

comment on function public.guardar_cuadro_honor_mes_en_curso(uuid, boolean) is
  'La administración elige si el Cuadro de Honor cuenta el mes en curso. Hueco 53.';

revoke execute on function public.guardar_cuadro_honor_mes_en_curso(uuid, boolean) from public, anon;
grant execute on function public.guardar_cuadro_honor_mes_en_curso(uuid, boolean) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cuadro_honor(p_condominio_id uuid)
 RETURNS TABLE(unidad_id uuid, codigo text, torre_numero integer, responsable_usuario_id uuid, responsable text, periodos_al_dia integer, periodos_totales integer, insignias integer, insignias_detalle jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with periodos as (
    select id, periodo
    from public.cuota_administracion
    where condominio_id = p_condominio_id
      -- El mes en curso cuenta solo si la administración lo elige (hueco 53):
      -- al empezar un mes nadie lo ha pagado y el cuadro salía vacío.
      and (public.cuadro_honor_cuenta_mes_en_curso(p_condominio_id)
           or coalesce(vence_en, (periodo + interval '1 month' - interval '1 day')::date)
              < public.hoy_en_el_edificio(p_condominio_id))
    order by periodo desc
    limit public.parametro_entero('cuotas_meses_historial', p_condominio_id)
  ),
  -- Si el estado de las cuotas se publica a quien pregunta (hueco 13).
  publica as (
    select coalesce(c.cuotas_visibilidad <> 'porcentaje', false)
           or public.es_admin_condominio(p_condominio_id) as si
    from public.condominio c
    where c.id = p_condominio_id
  ),
  responsables as (
    select distinct on (m.unidad_id)
      m.unidad_id, m.usuario_id, m.nombre
    from public.membresia_unidad m
    where m.activo
    order by m.unidad_id,
             m.es_admin_primario desc,
             (m.rol = 'propietario') desc,
             m.created_at
  )
  select
    u.id,
    u.codigo,
    t.numero,
    r.usuario_id,
    -- Si esa persona pidió aparecer con alias aquí, el nombre real no sale.
    coalesce(
      case when p.usa_alias_cuadro_honor
            and not public.es_admin_condominio(p_condominio_id)
            and not public.es_guardia_de_condominio(p_condominio_id)
           then nullif(p.alias, '') end,
      r.nombre
    ),
    case when pub.si then pagos.al_dia end,
    case when pub.si then (select count(*) from periodos)::int end,
    (select count(*)::int
       from public.reconocimiento rec
      where rec.usuario_id = r.usuario_id
        and rec.condominio_id = p_condominio_id),
    coalesce(
      (select jsonb_agg(
                jsonb_build_object(
                  'clave',    d.clave,
                  'etiqueta', d.etiqueta,
                  'icono',    d.icono,
                  'cantidad', d.cantidad
                )
                order by d.etiqueta
              )
         from (
           select i.clave, i.etiqueta, coalesce(i.icono, '⭐') as icono,
                  count(*)::int as cantidad
             from public.reconocimiento rec
             join public.insignia i on i.id = rec.insignia_id
            where rec.usuario_id = r.usuario_id
              and rec.condominio_id = p_condominio_id
            group by i.clave, i.etiqueta, i.icono
         ) d),
      '[]'::jsonb
    )
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  join responsables r on r.unidad_id = u.id
  left join public.perfil p on p.id = r.usuario_id
  cross join publica pub
  cross join lateral (
    select count(*) filter (where pc.pagado)::int as al_dia
    from periodos per
    left join public.pago_cuota pc
      on pc.cuota_id = per.id and pc.unidad_id = u.id
  ) pagos
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null
    and public.es_miembro_condominio(p_condominio_id)
    -- Solo los que pagan a tiempo, cuando eso se publica. Si no, todas: que
    -- falte una vivienda también diría que debe.
    and (not pub.si or pagos.al_dia = (select count(*) from periodos))
  order by t.numero, u.codigo;
$function$;
