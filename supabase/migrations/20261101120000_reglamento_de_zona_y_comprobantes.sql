-- Reglamento de la zona con documento, y comprobantes de pago a elección del
-- edificio (01/11/2026).
--
-- Para Claude 201: el reglamento de una zona común, además del texto, puede
-- llevar un documento (PDF o Word). Va al bucket `reglamentos`, en la carpeta
-- del edificio (`<condominio>/zonas/...`), así que lo leen los mismos que ya
-- leen el reglamento del edificio (`puede_ver_reglamento`) y lo sube la
-- administración (`es_admin_condominio`). No hace falta ninguna política nueva.
--
-- Para Claude 202: «Permitir subir comprobantes de pago en Zonas Comunes», un
-- interruptor del edificio. Encendido, una reserva de una zona de pago pide el
-- comprobante (lo de hasta hoy); apagado, no se pide ni se enseña, y el guardia
-- con permiso aprueba sin él. Nulo es «lo de la plataforma», el parámetro
-- `comprobantes_en_zonas_por_defecto` (encendido, para no cambiar nada a quien
-- no lo toque).
--
-- Solo aditiva.

alter table public.zona_comun
  add column if not exists reglamento_archivo_path text,
  add column if not exists reglamento_archivo_nombre text;

comment on column public.zona_comun.reglamento_archivo_path is
  'Ruta en el bucket reglamentos del documento del reglamento de la zona (PDF o Word), en la carpeta del edificio. Nulo: solo texto. Para Claude 201.';
comment on column public.zona_comun.reglamento_archivo_nombre is
  'Nombre con que se subió el documento del reglamento, para enseñarlo. Para Claude 201.';

insert into public.configuracion_plataforma
  (clave, valor, descripcion, tipo, valor_por_defecto, ambito, categoria, riesgo, es_publico)
values
  ('comprobantes_en_zonas_por_defecto', 'true',
   'Si una reserva de una zona común de pago pide el comprobante de pago, en un edificio cuya administración no lo ha elegido.',
   'booleano', 'true', 'edificio', 'zonas', 'bajo', false)
on conflict (clave) do nothing;

alter table public.condominio
  add column if not exists comprobantes_en_zonas boolean;

comment on column public.condominio.comprobantes_en_zonas is
  'Si las reservas de zonas de pago piden el comprobante de pago (true) o no (false). Lo elige la administración en Permisos; nulo: el parámetro comprobantes_en_zonas_por_defecto. Para Claude 202.';

create or replace function public.comprobantes_en_zonas(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(
    (select c.comprobantes_en_zonas from public.condominio c where c.id = p_condominio_id),
    public.parametro_booleano('comprobantes_en_zonas_por_defecto', p_condominio_id),
    true
  );
$function$;

comment on function public.comprobantes_en_zonas(uuid) is
  'Si en ese edificio las reservas de zonas de pago piden el comprobante: lo elegido por la administración o el parámetro de la plataforma. Para Claude 202.';

grant execute on function public.comprobantes_en_zonas(uuid) to authenticated, service_role;

create or replace function public.guardar_comprobantes_en_zonas(p_condominio_id uuid, p_permitir boolean)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if not public.es_admin_condominio(p_condominio_id) then
    raise exception 'Solo la administración decide si se piden comprobantes en las zonas comunes'
      using errcode = '42501';
  end if;

  update public.condominio
  set comprobantes_en_zonas = p_permitir
  where id = p_condominio_id;
end;
$function$;

comment on function public.guardar_comprobantes_en_zonas(uuid, boolean) is
  'La administración elige si las reservas de zonas de pago piden el comprobante. Para Claude 202.';

revoke execute on function public.guardar_comprobantes_en_zonas(uuid, boolean) from public, anon;
grant execute on function public.guardar_comprobantes_en_zonas(uuid, boolean) to authenticated, service_role;

-- El guardia con permiso solo necesita el comprobante si el edificio lo pide.
create or replace function public.proteger_resolucion_reserva()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_condominio uuid;
  v_anterior public.estado_reserva := null;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_anterior := old.estado;
  end if;

  if new.estado is not distinct from v_anterior then
    return new;
  end if;

  if new.estado not in ('aprobada', 'rechazada') then
    return new;
  end if;

  select z.condominio_id into v_condominio
  from public.zona_comun z where z.id = new.zona_id;

  -- El administrador siempre; el coadministrador, con su permiso.
  if public.puede_coadmin(v_condominio, 'aceptarReservasZonas') then
    return new;
  end if;

  -- El guardia con el permiso (29/10/2026). En una zona de pago, solo con el
  -- comprobante adjunto, si el edificio pide comprobantes (Para Claude 202).
  if public.guardia_aprueba_reservas(v_condominio) then
    if new.estado = 'aprobada' and public.zona_es_de_pago(new.zona_id)
       and public.comprobantes_en_zonas(v_condominio)
       and nullif(btrim(coalesce(new.comprobante_path, '')), '') is null then
      raise exception 'Es una zona de pago: adjunta el comprobante antes de aprobar';
    end if;
    return new;
  end if;

  raise exception 'No tienes permiso para aprobar o rechazar reservas de zonas comunes';
end;
$function$;
