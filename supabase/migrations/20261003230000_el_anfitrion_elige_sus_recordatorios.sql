-- ----------------------------------------------------------------------------
-- El anfitrion elige sus recordatorios
-- ----------------------------------------------------------------------------
-- Las tres columnas ya estan (`20261003210000`) y el cron ya las respeta. Esto
-- es lo que falta para que alguien pueda cambiarlas desde la aplicacion: sin
-- esto serian tres columnas que nadie escribe, que es exactamente el defecto
-- que mas veces ha aparecido en este proyecto.
--
-- ----------------------------------------------------------------------------
-- Por que una funcion aparte y no tres parametros mas en `guardar_alojamiento`
-- ----------------------------------------------------------------------------
-- Porque `guardar_alojamiento` toca el Vault --las claves del wifi y de la
-- puerta-- y ya se rompio entera una vez por un secreto huerfano, dejando al
-- anfitrion sin poder guardar nada. Es otro bloque de configuracion y vive
-- aparte: si esto falla, lo que falla es esto.
--
-- Aditiva.

create or replace function public.guardar_recordatorios_precheckin(
  p_unidad_id    uuid,
  p_al_huesped   boolean,
  p_al_anfitrion boolean,
  p_dias         smallint[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_dias smallint[];
begin
  -- El mismo permiso que el resto de la ficha del alojamiento: quien gestiona
  -- la vivienda. No se inventa uno nuevo.
  if not public.puede_operar_unidad(p_unidad_id) then
    raise exception 'No tenes permiso para configurar esta vivienda';
  end if;

  if not exists (select 1 from public.suscripcion_renta_corta where unidad_id = p_unidad_id) then
    raise exception 'Esta vivienda no tiene renta corta activada';
  end if;

  /*
    Ordenados de mas lejos a mas cerca y sin repetidos. Lo segundo importa: con
    `{7,7,3}` el cron mandaria dos veces el mismo dia --y la constancia lo
    impediria, pero por accidente y dejando una fila de error--. Mejor que no
    se pueda escribir.
  */
  v_dias := coalesce(
    (select array_agg(distinct d order by d desc) from unnest(p_dias) d),
    '{}'::smallint[]
  );

  if not public.dias_de_recordatorio_sensatos(v_dias) then
    raise exception 'Los avisos van de 1 a 60 dias antes de la llegada';
  end if;

  update public.suscripcion_renta_corta
  set recordatorio_al_huesped   = coalesce(p_al_huesped, recordatorio_al_huesped),
      recordatorio_al_anfitrion = coalesce(p_al_anfitrion, recordatorio_al_anfitrion),
      recordatorio_dias         = v_dias
  where unidad_id = p_unidad_id;
end;
$fn$;

comment on function public.guardar_recordatorios_precheckin is
  'A quien avisar y con cuanta antelacion cuando un huesped no termina su preregistro. Lo elige el anfitrion, por vivienda.';

revoke all on function public.guardar_recordatorios_precheckin(uuid, boolean, boolean, smallint[]) from public;
grant execute on function public.guardar_recordatorios_precheckin(uuid, boolean, boolean, smallint[]) to authenticated;
