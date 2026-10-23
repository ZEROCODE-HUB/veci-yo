-- El correo de ingreso aprobado lleva el resumen de la reserva.
--
-- QA 23/10/2026: al aprobarse el ingreso, el correo trae el QR dentro (lo pinta
-- `enviar-correo`) y el resumen de la reserva: vivienda y fechas. Esta función
-- solo añade esos tres datos al cuerpo de la petición; el resto queda igual.

CREATE OR REPLACE FUNCTION public.avisar_ingreso_aprobado(p_visita_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp', 'vault', 'extensions'
AS $function$
declare
  v        record;
  v_url    text;
  v_clave  text;
  v_base   text;
  v_codigo text;
  p        record;
  v_n      int := 0;
begin
  select vi.id, vi.codigo_acceso, vi.ingreso_aprobado_avisado_en, vi.tipo, c.nombre as condominio,
         u.codigo as unidad, vi.fecha_desde, vi.fecha_hasta
    into v
  from public.visita vi join public.condominio c on c.id = vi.condominio_id
  left join public.unidad u on u.id = vi.unidad_id
  where vi.id = p_visita_id;

  if v.id is null or v.tipo <> 'huesped_temporal' or v.ingreso_aprobado_avisado_en is not null then
    return 0;
  end if;
  if not public.estancia_aprobada(p_visita_id) then
    return 0;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'veciyo_url_funciones';
  select decrypted_secret into v_clave from vault.decrypted_secrets where name = 'veciyo_clave_servicio';
  if v_url is null or v_clave is null then
    return 0;
  end if;
  select coalesce(
    (select decrypted_secret from vault.decrypted_secrets where name = 'veciyo_url_web'),
    'https://veciyo-web-seven.vercel.app'
  ) into v_base;

  v_codigo := v.codigo_acceso;
  if v_codigo is null then
    v_codigo := upper(encode(gen_random_bytes(6), 'hex'));
    update public.visita set codigo_acceso = v_codigo where id = p_visita_id;
  end if;

  for p in
    select i.nombre, i.correo from public.invitado i
    where i.visita_id = p_visita_id and not i.es_menor
      and coalesce(btrim(i.correo), '') <> ''
      -- Los dominios de prueba no: las pruebas cierran preregistros a diario.
      and i.correo !~* '(\.(test|example|invalid)$|@ejemplo\.)'
  loop
    perform net.http_post(
      url     := v_url || '/functions/v1/enviar-correo',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_clave
      ),
      body    := jsonb_build_object(
        'tipo',       'ingreso-aprobado',
        'correo',     p.correo,
        'nombre',     p.nombre,
        'enlace',     v_base || '/qr/' || v_codigo,
        'condominio', v.condominio,
        'unidad',     v.unidad,
        'desde',      v.fecha_desde,
        'hasta',      v.fecha_hasta
      )
    );
    v_n := v_n + 1;
  end loop;

  update public.visita set ingreso_aprobado_avisado_en = now() where id = p_visita_id;
  return v_n;
end;
$function$;
