-- Dos restos del aviso de preregistros sin hacer (Parametrización, 25/10/2026).
--
-- 1. `avisar_preregistros_incompletos` --el aviso en la campana del anfitrión
--    a `preregistro_alerta_dias` de la llegada-- no miraba el interruptor
--    «recordatorio_al_anfitrion»: salía aunque el anfitrión lo hubiera
--    apagado. Los días son otra cosa y se quedan: este aviso es del edificio
--    (`preregistro_alerta_dias`); los días que elige el anfitrión son los del
--    correo (`precheckins_por_recordar`), que ya los respetaba.
--
-- 2. `recordatorio_dias` nacía con '{7,3,1}' escrito en la columna, aunque el
--    parámetro `preregistro_recordatorio_dias_por_defecto` existía.

CREATE OR REPLACE FUNCTION public.avisar_preregistros_incompletos()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  f record;
  n int := 0;
begin
  for f in
    select v.id, v.unidad_id, v.fecha_desde,
           (v.fecha_desde - (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date) as faltan,
           coalesce(t.nombre, 'Tu huésped') as nombre
    from public.visita v
    left join public.invitado t on t.visita_id = v.id and t.es_titular
    -- El interruptor del anfitrión: sin esto el aviso salía aunque lo
    -- hubiera apagado (Parametrización, 25/10/2026).
    left join public.suscripcion_renta_corta s on s.unidad_id = v.unidad_id
    where v.tipo = 'huesped_temporal'
      and coalesce(s.recordatorio_al_anfitrion, true)
      and v.precheckin_completado_en is null
      and v.estado not in ('cancelada', 'finalizada')
      and v.fecha_desde between (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date
                            and (now() at time zone public.zona_horaria_del_condominio(v.condominio_id))::date + public.parametro_entero('preregistro_alerta_dias', v.condominio_id)
      and not exists (
        select 1 from public.notificacion n
        where n.entidad_id = v.id and n.tipo = 'preregistro_incompleto'
      )
  loop
    perform public.notificar_anfitrion(
      f.unidad_id, 'preregistro_incompleto',
      'Llega pronto y sin preregistro',
      f.nombre || ' llega ' ||
        case when f.faltan <= 0 then 'hoy' when f.faltan = 1 then 'mañana'
             else 'en ' || f.faltan || ' días' end ||
        ' y no ha hecho su preregistro. Puedes recordárselo desde tu inicio.',
      'visita', f.id
    );
    n := n + 1;
  end loop;
  return n;
end;
$function$;


create or replace function public.recordatorio_dias_por_defecto()
returns smallint[]
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(array_agg(x::smallint order by x::int desc), '{}'::smallint[])
  from jsonb_array_elements_text(public.parametro_lista('preregistro_recordatorio_dias_por_defecto')) x;
$$;

comment on function public.recordatorio_dias_por_defecto() is
  'Los días de recordatorio con que nace la renta corta de una vivienda '
  '(`preregistro_recordatorio_dias_por_defecto`).';

alter table public.suscripcion_renta_corta
  alter column recordatorio_dias set default public.recordatorio_dias_por_defecto();
