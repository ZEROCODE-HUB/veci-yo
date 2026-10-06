-- ----------------------------------------------------------------------------
-- El token de la TRA y el permiso de disparar son dos cosas distintas
-- ----------------------------------------------------------------------------
-- El 06/10/2026 el cliente entrego un token real de la TRA, con su RNT real
-- --un apartamento turistico de Cartagena, registro 266365-- y lo dijo asi:
-- «cuidado con el TRA, creo que es cuenta real».
--
-- Tenia razon, y el peligro era mayor de lo que parecia. `reportar-tra` decide
-- si sale a internet mirando **una sola cosa**: si hay token. O sea que
-- guardar el token habria encendido el envio real de golpe, y lo primero que
-- habria salido no es una demo:
--
--   · `reportar-a-la-tra.test.ts` crea huespedes inventados y llama a la
--     funcion. Cada corrida de `npm run test:rls` habria presentado
--     **declaraciones legales reales** al MinCIT sobre el RNT de esa señora,
--     con nombres que no existen;
--   · y la propia funcion avisa de que no reintenta sola a proposito, porque
--     «un reporte al Estado que se repite sin que nadie lo mire puede acabar
--     declarando dos veces la misma estancia, y deshacer eso no se hace por
--     API».
--
-- Asi que el token se puede guardar --hace falta para que el camino este
-- completo-- y el permiso de disparar nace **apagado**. Se enciende a mano,
-- por vivienda, el dia que su anfitrion vaya a reportar a un huesped de
-- verdad.
--
-- Es la misma idea que `ENVIO_CORREO_ACTIVO`: tener la credencial no es querer
-- usarla todavia.
--
-- Aditiva: una columna y una funcion. No borra nada.

alter table public.suscripcion_renta_corta
  add column if not exists tra_armado boolean not null default false;

comment on column public.suscripcion_renta_corta.tra_armado is
  'Si los reportes a la TRA de esta vivienda salen de verdad al MinCIT. **Nace apagado aunque haya token**: un reporte al Estado es una declaracion legal que no se deshace por API, y las pruebas crean huespedes inventados. Se enciende a mano cuando el anfitrion va a reportar a alguien real.';

CREATE OR REPLACE FUNCTION public.datos_para_la_tra(p_visita_id uuid)
 RETURNS TABLE(invitado_id uuid, es_titular boolean, nombres text, apellidos text, tipo_documento text, documento text, ciudad_residencia text, ciudad_procedencia text, numero_habitacion text, check_in date, check_out date, motivo text, tipo_acomodacion text, costo numeric, nombre_establecimiento text, rnt text, tiene_token boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_unidad uuid;
begin
  select v.unidad_id into v_unidad from public.visita v where v.id = p_visita_id;

  if v_unidad is null then
    raise exception 'Esa estancia no existe';
  end if;

  /*
    Reportar a la TRA es un acto del **anfitrion**: es su RNT el que queda
    declarado y es el quien responde ante el ministerio. Por eso se pregunta por
    la vivienda y no por el condominio: la administracion del edificio no
    reporta las estancias de nadie.
  */
  if not public.puede_operar_unidad(v_unidad) then
    raise exception 'Esa vivienda no es tuya';
  end if;

  return query
  select
    i.id,
    i.es_titular,
    i.nombre,
    i.apellidos,
    i.tipo_documento::text,
    i.documento_numero,
    i.ciudad_residencia,
    i.ciudad_procedencia,
    u.codigo,
    v.fecha_desde,
    v.fecha_hasta,
    i.motivo::text,
    /*
      El ministerio pide el tipo de alojamiento en texto libre. Sale de la
      tipologia de la vivienda cuando la hay; si no, «Apartamento», que es lo
      que es un piso de un edificio.
    */
    coalesce(t.nombre, 'Apartamento'),
    v.costo_estancia,
    c.nombre,
    s.rnt,
    /*
      «Hay token» NO basta para salir a internet: tiene que estar **armado**.

      Un reporte a la TRA es una declaracion legal ante el MinCIT sobre un RNT
      de alguien, y deshacerla no se hace por API --lo dice la cabecera de la
      funcion--. Con la regla vieja, el dia que se guardara el token:

        · el recorrido `reportar-a-la-tra` --que crea huespedes inventados y
          llama a la funcion-- habria presentado **declaraciones reales**;
        · y cualquiera pulsando el boton en una demo, tambien.

      Asi que el token y el permiso de disparar son dos cosas distintas, y la
      segunda nace apagada. Se enciende a mano, por vivienda, cuando su
      anfitrion de verdad va a reportar a un huesped de verdad.
    */
    s.tra_token_secret is not null and coalesce(s.tra_armado, false)
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  join public.unidad u on u.id = v.unidad_id
  join public.condominio c on c.id = v.condominio_id
  left join public.tipologia t on t.id = u.tipologia_id
  left join public.suscripcion_renta_corta s on s.unidad_id = v.unidad_id
  where i.visita_id = p_visita_id
  -- El titular primero: su reporte devuelve el codigo que agrupa a los demas.
  order by i.es_titular desc, i.orden;
end;
$function$

;
