-- ----------------------------------------------------------------------------
-- Invitar a un huésped: la estancia viaja en la invitación
-- ----------------------------------------------------------------------------
-- Regresión introducida por 20260922191000. Esa migración añadió la
-- restricción `membresia_unidad_huesped_con_vigencia` —un huésped tiene que
-- tener fecha de salida— y no se revisó el único camino por el que la
-- aplicación crea membresías: `aceptar_invitacion`, que inserta la fila **sin
-- fechas**.
--
-- Resultado: invitar a alguien como `huesped_temporal` fallaba al aceptar, con
-- un error de restricción en la cara de quien pulsaba el enlace. No se detectó
-- porque el huésped de las pruebas se había sembrado con SQL directo, saltando
-- el camino real.
--
-- Se corrige donde corresponde: la estancia es parte de la invitación. A quien
-- se invita no se le dice "sos huésped" sino "te alojás del 3 al 7".

alter table public.invitacion
  add column vigente_desde date,
  add column vigente_hasta date;

alter table public.invitacion
  add constraint invitacion_vigencia_coherente
    check (vigente_hasta is null or vigente_desde is null
           or vigente_hasta >= vigente_desde),
  -- La misma regla que en la membresía, aplicada un paso antes. Sin esto la
  -- invitación se crearía bien y reventaría al aceptarse, que es el peor sitio
  -- donde puede fallar: en la cara de quien llega.
  add constraint invitacion_huesped_con_vigencia
    check (rol_unidad is distinct from 'huesped_temporal'
           or vigente_hasta is not null);

comment on column public.invitacion.vigente_hasta is
  'Ultimo dia de la estancia. Obligatorio si se invita como huesped temporal; se copia a la membresia al aceptar.';


-- `create or replace` con dos parametros nuevos crea una SOBRECARGA, no
-- reemplaza: quedarian dos `crear_invitacion` y PostgREST no sabria cual
-- llamar. Se elimina la de siete argumentos.
drop function if exists public.crear_invitacion(
  uuid, public.ambito_invitacion, text, text, uuid,
  public.rol_unidad, public.rol_condominio
);

create or replace function public.crear_invitacion(
  p_condominio_id  uuid,
  p_ambito         public.ambito_invitacion,
  p_correo         text,
  p_nombre         text,
  p_unidad_id      uuid DEFAULT NULL,
  p_rol_unidad     public.rol_unidad DEFAULT NULL,
  p_rol_condominio public.rol_condominio DEFAULT NULL,
  p_vigente_desde  date DEFAULT NULL,
  p_vigente_hasta  date DEFAULT NULL
)
returns table(invitacion_id uuid, token text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_token text;
  v_id uuid;
  v_correo text := lower(trim(p_correo));
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada';
  end if;

  if p_ambito = 'unidad' then
    if not public.puede_invitar_a_unidad(p_unidad_id) then
      raise exception 'No tenes permiso para invitar a esta unidad';
    end if;
  else
    if not public.es_admin_condominio(p_condominio_id) then
      raise exception 'Solo la administracion del condominio puede invitar a estos roles';
    end if;
  end if;

  -- Mensaje propio en vez del error de la restriccion, que no le dice nada a
  -- quien esta invitando.
  if p_rol_unidad = 'huesped_temporal' and p_vigente_hasta is null then
    raise exception 'Una invitacion de huesped temporal necesita la fecha de fin de la estancia';
  end if;

  if p_vigente_hasta is not null and p_vigente_hasta < current_date then
    raise exception 'La estancia termina antes de hoy';
  end if;

  -- Una sola invitacion pendiente por correo y destino.
  update public.invitacion
     set estado = 'revocada', updated_at = now()
   where lower(correo) = v_correo
     and estado = 'pendiente'
     and condominio_id = p_condominio_id
     and unidad_id is not distinct from p_unidad_id;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.invitacion (
    condominio_id, ambito, unidad_id, rol_unidad, rol_condominio,
    correo, nombre, token_hash, invitada_por, vigente_desde, vigente_hasta
  ) values (
    p_condominio_id, p_ambito, p_unidad_id, p_rol_unidad, p_rol_condominio,
    v_correo, p_nombre, encode(extensions.digest(v_token, 'sha256'), 'hex'),
    auth.uid(), p_vigente_desde, p_vigente_hasta
  )
  returning id into v_id;

  return query select v_id, v_token;
end;
$function$;


create or replace function public.aceptar_invitacion(p_token text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_inv public.invitacion%rowtype;
  v_correo_usuario text;
  v_membresia_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada para aceptar la invitacion';
  end if;

  select * into v_inv
  from public.invitacion
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'La invitacion no existe';
  end if;

  if v_inv.estado <> 'pendiente' then
    raise exception 'Esta invitacion ya no esta disponible';
  end if;

  if v_inv.expira_en <= now() then
    update public.invitacion set estado = 'expirada', updated_at = now() where id = v_inv.id;
    raise exception 'La invitacion vencio';
  end if;

  -- La invitacion es para una persona concreta, no para quien tenga el enlace.
  select lower(email) into v_correo_usuario from auth.users where id = auth.uid();
  if v_correo_usuario is distinct from lower(v_inv.correo) then
    raise exception 'Esta invitacion fue emitida para otro correo';
  end if;

  -- Una estancia que ya termino no se acepta: daria una membresia que no
  -- deja ver nada y nadie entenderia por que.
  if v_inv.vigente_hasta is not null and v_inv.vigente_hasta < current_date then
    update public.invitacion set estado = 'expirada', updated_at = now() where id = v_inv.id;
    raise exception 'La estancia de esta invitacion ya termino';
  end if;

  if v_inv.ambito = 'unidad' then
    insert into public.membresia_unidad (
      unidad_id, usuario_id, nombre, rol, vigente_desde, vigente_hasta
    )
    values (
      v_inv.unidad_id, auth.uid(), v_inv.nombre, v_inv.rol_unidad,
      v_inv.vigente_desde, v_inv.vigente_hasta
    )
    returning id into v_membresia_id;

    update public.unidad
       set estado = 'aceptado', updated_at = now()
     where id = v_inv.unidad_id and estado in ('disponible', 'invitado');
  else
    insert into public.membresia_condominio (condominio_id, usuario_id, rol)
    values (v_inv.condominio_id, auth.uid(), v_inv.rol_condominio)
    on conflict (condominio_id, usuario_id, rol) do update set activo = true
    returning id into v_membresia_id;
  end if;

  update public.invitacion
     set estado = 'aceptada',
         aceptada_por = auth.uid(),
         aceptada_en = now(),
         updated_at = now()
   where id = v_inv.id;

  return v_membresia_id;
end;
$function$;
