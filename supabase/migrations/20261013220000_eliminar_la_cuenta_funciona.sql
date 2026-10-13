-- ============================================================================
-- Eliminar la cuenta funciona
-- ============================================================================
-- Decidido con el cliente el 13/10/2026: «pausar» se quita y «eliminar» tiene
-- que funcionar. El boton pedia el motivo y una confirmacion para responder
-- «todavia no esta disponible».
--
-- Que significa eliminar, con el esquema que ya hay:
--
--   · **lo que es de la persona se va con ella**: su perfil, sus avisos, sus
--     preferencias, sus sesiones. Esas claves foraneas ya eran `on delete
--     cascade`;
--   · **lo que es constancia de algo que paso se queda, sin su nombre**: la
--     visita que registro, el paquete que recibio, el reporte que envio. Esas
--     ya eran `on delete set null`. La regla 2 pide saber quien hizo que, y
--     eso deja de saberse para esta persona: es lo que pidio al irse;
--   · **sus membresias quedan dadas de baja**, no borradas: la vivienda
--     conserva su historia.
--
-- Dos cosas no se dejan:
--
--   · irse siendo la **unica administracion** de un edificio, que lo dejaria
--     sin nadie que pueda nombrar a otra persona;
--   · irse con una **estancia de huespedes abierta** como anfitrion, porque
--     hay gente dentro de la que alguien responde.
--
-- Queda una linea de constancia sin datos personales: cuando y por que.

create table if not exists public.cuenta_eliminada (
  id            uuid primary key default gen_random_uuid(),
  -- Sin clave foranea a proposito: la cuenta deja de existir en esta misma
  -- transaccion. Sirve para cruzar con la bitacora si hiciera falta.
  usuario_id    uuid not null,
  motivo        text,
  eliminada_en  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.cuenta_eliminada is
  'Constancia de que una cuenta se elimino a peticion de su dueño: cuando y por que. Sin nombre, correo ni documento.';

alter table public.cuenta_eliminada enable row level security;

-- Solo la lee quien opera la plataforma. Nadie escribe desde fuera: lo hace
-- `eliminar_mi_cuenta`.
drop policy if exists cuenta_eliminada_lectura on public.cuenta_eliminada;
create policy cuenta_eliminada_lectura on public.cuenta_eliminada
  for select to authenticated
  using (public.es_staff_plataforma());

CREATE OR REPLACE FUNCTION public.proteger_membresia_unidad()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_unidad uuid;
  v_admin  boolean;
begin
  v_unidad := case when tg_op = 'DELETE' then old.unidad_id else new.unidad_id end;

  -- Sin sesion de aplicacion no hay a quien restringir: son las migraciones,
  -- la clave de servicio o la consola SQL, que ya pasan por encima de RLS de
  -- todos modos.
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- `aceptar_invitacion` crea la membresia en nombre de quien acepta, y puede
  -- ser la del propietario. Esa alta ya paso su propio control. La bandera es
  -- local a la transaccion: nadie puede encenderla desde fuera.
  if coalesce(current_setting('veciyo.alta_por_invitacion', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- `designar_primario` comprueba su propia autorizacion --quien gestiona la
  -- gente de la vivienda-- y necesita poder tocar la fila del propietario y la
  -- de uno mismo. Misma tecnica y mismo alcance: una transaccion.
  if coalesce(current_setting('veciyo.designando_primario', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- `eliminar_mi_cuenta` da de baja las membresias de quien se va, tambien la
  -- del propietario: la vivienda sigue siendo suya en los papeles, pero la
  -- cuenta deja de existir. Misma tecnica y mismo alcance: una transaccion.
  if coalesce(current_setting('veciyo.eliminando_cuenta', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_admin := public.es_admin_condominio(public.condominio_de_unidad(v_unidad));
  if v_admin then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- La propiedad de una vivienda es un hecho legal que registra la
  -- administracion. No se la pone uno, no se la quita a otro.
  if tg_op = 'DELETE' and old.rol = 'propietario' then
    raise exception 'Solo la administracion puede dar de baja al propietario de una vivienda';
  end if;
  if tg_op = 'INSERT' and new.rol = 'propietario' then
    raise exception 'Solo la administracion puede registrar al propietario de una vivienda';
  end if;
  if tg_op = 'UPDATE'
     and new.rol = 'propietario'
     and new.rol is distinct from old.rol then
    raise exception 'Solo la administracion puede registrar al propietario de una vivienda';
  end if;

  -- Lo que esta vedado de la membresia del propietario es **lo que la hace ser
  -- la del propietario**, no todo lo que lleva dentro.
  if tg_op = 'UPDATE' and old.rol = 'propietario' and (
       new.rol         is distinct from old.rol
    or new.usuario_id  is distinct from old.usuario_id
    or new.unidad_id   is distinct from old.unidad_id
    or new.activo      is distinct from old.activo
  ) then
    raise exception 'Solo la administracion puede modificar la membresia del propietario';
  end if;

  -- Y nadie se cambia a si mismo el rol, sus permisos ni **sus fechas**.
  --
  -- Las dos fechas faltaban, y eran las mas caras de las cinco: un huesped se
  -- ponia `vigente_hasta` en 2030 con una sola llamada y recuperaba la estancia
  -- entera. Comprobado el 01/10/2026 con Ramiro, cuya estancia termino el 7 de
  -- agosto: respuesta 200 y fecha guardada.
  --
  -- Lo que eso devuelve no es solo entrar a la aplicacion. Las credenciales de
  -- la vivienda --la clave del wifi y la de la puerta-- las protege
  -- `es_huesped_alojado`, que comprueba justamente esa fecha. O sea que la
  -- condicion que guarda el secreto la podia escribir quien queria leerlo.
  --
  -- Quien si puede moverlas sigue pudiendo: la administracion sale antes de
  -- llegar aqui, el anfitrion escribe la fila de su huesped --que no es la
  -- suya-- y el alta por invitacion viene con su bandera.
  if tg_op = 'UPDATE' and new.usuario_id = auth.uid() and (
       new.rol is distinct from old.rol
    or new.puede_acceder is distinct from old.puede_acceder
    or new.activo is distinct from old.activo
    or new.es_admin_primario is distinct from old.es_admin_primario
    or new.es_anfitrion_primario is distinct from old.es_anfitrion_primario
    or new.vigente_desde is distinct from old.vigente_desde
    or new.vigente_hasta is distinct from old.vigente_hasta
  ) then
    raise exception 'No podes cambiar tu propio rol, tus permisos ni las fechas de tu estancia';
  end if;

  -- En un disparador `before delete`, devolver `new` es devolver NULL, y eso
  -- **cancela el borrado en silencio**: ni error, ni fila, ni pista.
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$;

create or replace function public.eliminar_mi_cuenta(p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp, auth
as $fn$
declare
  v_yo uuid := auth.uid();
  v_edificio text;
begin
  if v_yo is null then
    raise exception 'Se requiere una sesión iniciada';
  end if;

  -- No se va la unica administracion de un edificio.
  select c.nombre into v_edificio
  from public.membresia_condominio mc
  join public.condominio c on c.id = mc.condominio_id
  where mc.usuario_id = v_yo
    and mc.activo
    and mc.rol = 'administrador'
    and not exists (
      select 1 from public.membresia_condominio otra
      where otra.condominio_id = mc.condominio_id
        and otra.activo
        and otra.rol = 'administrador'
        and otra.usuario_id <> v_yo
    )
  limit 1;

  if v_edificio is not null then
    raise exception 'Eres la única administración de %. Nombra a otra persona antes de eliminar tu cuenta.', v_edificio;
  end if;

  -- Ni quien tiene huespedes dentro, o por llegar, en una vivienda que
  -- gestiona.
  if exists (
    select 1
    from public.visita v
    join public.membresia_unidad mu on mu.unidad_id = v.unidad_id
    where mu.usuario_id = v_yo
      and mu.activo
      and mu.rol in ('propietario', 'inquilino_lider')
      and v.tipo = 'huesped_temporal'
      and v.estado in ('programada', 'ingresada')
      and coalesce(v.fecha_hasta, current_date) >= current_date
  ) then
    raise exception 'Tienes estancias de huéspedes abiertas. Ciérralas o cancélalas antes de eliminar tu cuenta.';
  end if;

  insert into public.cuenta_eliminada (usuario_id, motivo)
  values (v_yo, nullif(btrim(coalesce(p_motivo, '')), ''));

  -- Las membresias se dan de baja, no se borran. Local a la transaccion.
  perform set_config('veciyo.eliminando_cuenta', 'on', true);

  -- `puede_acceder` tambien: la tabla no admite una membresia con acceso y
  -- sin cuenta, que es justo como queda al borrar la cuenta de abajo.
  update public.membresia_unidad
     set activo = false, puede_acceder = false, updated_at = now()
   where usuario_id = v_yo;

  update public.membresia_condominio
     set activo = false, updated_at = now()
   where usuario_id = v_yo and activo;

  -- Y la cuenta. Lo que cuelga de ella se va o se queda sin nombre, segun
  -- diga su clave foranea.
  delete from auth.users where id = v_yo;

  perform set_config('veciyo.eliminando_cuenta', 'off', true);
end;
$fn$;

comment on function public.eliminar_mi_cuenta(text) is
  'Elimina la cuenta de quien la llama. Da de baja sus membresias, deja una linea de constancia sin datos personales y borra la cuenta. No deja irse a la unica administracion de un edificio ni a un anfitrion con estancias abiertas.';

revoke execute on function public.eliminar_mi_cuenta(text) from public, anon;
grant execute on function public.eliminar_mi_cuenta(text) to authenticated;
