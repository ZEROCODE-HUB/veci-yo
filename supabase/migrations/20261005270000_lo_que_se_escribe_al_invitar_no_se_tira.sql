-- ----------------------------------------------------------------------------
-- Lo que se escribe al invitar no se tira
-- ----------------------------------------------------------------------------
-- La pantalla de coadministradores pide nombre, correo y **celular**, y el
-- celular se perdia: `invitacion` no tenia columna para el telefono de quien se
-- invita --solo para el de su contacto de emergencia-- asi que el numero
-- quedaba en el formulario y nunca llegaba a ninguna parte. Estaba anotado en
-- REVISAR-A-OJO (155) y el cliente dijo que se arregle.
--
-- ----------------------------------------------------------------------------
-- Y al mirarlo aparecio uno peor, en la misma linea
-- ----------------------------------------------------------------------------
-- `aceptar_invitacion`, en la rama de condominio, hacia esto:
--
--     insert into public.membresia_condominio (condominio_id, usuario_id, rol)
--
-- **Sin el nombre.** O sea que la administracion escribe «Rosa Delgado» al
-- invitar, Rosa acepta, y en la lista de coadministradores aparece
-- **«Sin nombre»** --ese literal esta en el repositorio, como valor por
-- defecto--. La rama de unidad si lo pone.
--
-- Es la misma familia que el telefono --lo que se escribe no llega-- y salio
-- solo porque habia que tocar ese `insert` para lo otro.
--
-- **Todavia no habia mordido**, y conviene decirlo con el numero delante: hay
-- una membresia de condominio sin nombre, pero es la de Renata en el segundo
-- edificio, que la crea el script de siembra y no una invitacion. O sea que
-- ninguna fila del cliente esta mal por esto hoy; lo que habia era la puerta
-- abierta. Comprobado antes de afirmarlo:
--
--     select m.id, m.rol, m.usuario_id from membresia_condominio m
--     where m.nombre is null;
--
-- ----------------------------------------------------------------------------
-- Lo que NO se arregla aqui, y conviene saberlo
-- ----------------------------------------------------------------------------
-- Los **permisos** que se marcan al invitar tampoco se guardan, por lo mismo:
-- la invitacion no tiene donde ponerlos. La diferencia es que eso ya estaba
-- escrito en el repositorio y tiene arreglo a mano --se editan despues, cuando
-- la persona ya es miembro--, mientras que el nombre se queda en «Sin nombre»
-- hasta que alguien lo note. Va a REVISAR-A-OJO en vez de construirse por mi
-- cuenta.
--
-- Aditiva: dos columnas y dos funciones. No borra nada.

-- ----------------------------------------------------------------------------
-- 1. El telefono de quien se invita
-- ----------------------------------------------------------------------------
-- Separado de `contacto_emergencia_telefono`, que es a quien llamar **si le
-- pasa algo** a esta persona. No son el mismo numero ni de lejos.

alter table public.invitacion
  add column if not exists telefono text,
  add column if not exists codigo_pais text;

comment on column public.invitacion.telefono is
  'El celular de quien se invita, sin prefijo. Se copia a la membresia al aceptar. Hasta el 05/10/2026 la pantalla lo pedia y se perdia: no habia donde guardarlo.';

comment on column public.invitacion.codigo_pais is
  'ISO 3166-1 alfa-2 del telefono de arriba. Sin el, un numero no se puede marcar desde fuera ni mandar por WhatsApp.';

-- Y **validada en el acto**, no `NOT VALID`. La columna acaba de nacer vacia,
-- asi que no hay nada viejo que perdonar, y una restriccion a medias es la
-- bomba con temporizador que ya dejo el perfil de Sofia sin poderse editar.
alter table public.invitacion
  add constraint invitacion_codigo_pais_es_iso2
  check (codigo_pais is null or codigo_pais ~ '^[A-Z]{2}$');

-- ----------------------------------------------------------------------------
-- 2. La invitacion los recibe
-- ----------------------------------------------------------------------------
-- La firma vieja **se borra**: `create or replace` con otro numero de
-- argumentos no reemplaza, crea una sobrecarga, y entonces una llamada por
-- nombre no sabe a cual ir. Ya mordio dos veces esta semana.

drop function if exists public.crear_invitacion(
  uuid, ambito_invitacion, text, text, uuid, rol_unidad, rol_condominio,
  date, date, text, text, text);

create or replace function public.crear_invitacion(
  p_condominio_id      uuid,
  p_ambito             ambito_invitacion,
  p_correo             text,
  p_nombre             text,
  p_unidad_id          uuid default null,
  p_rol_unidad         rol_unidad default null,
  p_rol_condominio     rol_condominio default null,
  p_vigente_desde      date default null,
  p_vigente_hasta      date default null,
  p_contacto_nombre    text default null,
  p_contacto_codigo    text default null,
  p_contacto_telefono  text default null,
  -- El telefono de la propia persona. Al final, para no cambiar el orden de
  -- los que ya se mandan por posicion.
  p_telefono           text default null,
  p_codigo_pais        text default null
)
returns table(invitacion_id uuid, token text)
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_token  text := encode(extensions.gen_random_bytes(32), 'hex');
  v_correo text := lower(trim(p_correo));
  v_id     uuid;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesion iniciada';
  end if;

  if p_ambito = 'unidad' then
    if not public.puede_invitar_a_unidad(p_unidad_id) then
      raise exception 'No tenes permiso para invitar a esta unidad';
    end if;

    -- La propiedad de una vivienda es un hecho legal que registra la
    -- administracion: quien gestiona la vivienda da de alta a los suyos, no a
    -- su dueño.
    --
    -- El huesped temporal NO entra aqui, aunque la misma frase del KT lo
    -- nombre. Lo que dice es que "va por otro flujo" --el precheckin--, no que
    -- solo la administracion pueda darlo de alta; y ese flujo todavia no
    -- existe (R-90). Restringirlo dejaria al anfitrion sin ninguna forma de
    -- recibir a su huesped, que es el producto entero.
    if p_rol_unidad = 'propietario'
       and not public.es_admin_condominio(p_condominio_id) then
      raise exception 'Solo la administracion puede registrar al propietario de una vivienda';
    end if;
  else
    if not public.es_admin_condominio(p_condominio_id) then
      raise exception 'Solo la administracion del condominio puede invitar a estos roles';
    end if;
  end if;

  if p_rol_unidad = 'huesped_temporal' and p_vigente_hasta is null then
    raise exception 'Una invitacion de huesped temporal necesita la fecha de fin de la estancia';
  end if;

  if p_vigente_hasta is not null and p_vigente_hasta < current_date then
    raise exception 'La estancia termina antes de hoy';
  end if;

  if p_vigente_desde is not null and p_vigente_hasta is not null
     and p_vigente_desde > p_vigente_hasta then
    raise exception 'La estancia termina antes de empezar';
  end if;

  insert into public.invitacion (
    condominio_id, ambito, unidad_id, rol_unidad, rol_condominio,
    correo, nombre, token_hash, invitada_por, expira_en,
    vigente_desde, vigente_hasta,
    contacto_emergencia_nombre, contacto_emergencia_codigo,
    contacto_emergencia_telefono,
    telefono, codigo_pais
  ) values (
    p_condominio_id, p_ambito, p_unidad_id, p_rol_unidad, p_rol_condominio,
    v_correo, p_nombre,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    auth.uid(), now() + interval '7 days',
    p_vigente_desde, p_vigente_hasta,
    nullif(btrim(coalesce(p_contacto_nombre, '')), ''),
    nullif(btrim(coalesce(p_contacto_codigo, '')), ''),
    nullif(btrim(coalesce(p_contacto_telefono, '')), ''),
    -- Solo digitos, igual que lo que manda el campo: el prefijo sale del
    -- codigo del pais y un numero no se guarda ya formateado.
    nullif(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), ''),
    nullif(upper(btrim(coalesce(p_codigo_pais, ''))), '')
  )
  returning id into v_id;

  return query select v_id, v_token;
end;
$fn$;

comment on function public.crear_invitacion(
  uuid, ambito_invitacion, text, text, uuid, rol_unidad, rol_condominio,
  date, date, text, text, text, text, text) is
  'Emite una invitacion y devuelve su enlace una sola vez. Desde el 05/10/2026 lleva tambien el telefono de quien se invita, con su pais: antes la pantalla lo pedia y se perdia.';

-- ----------------------------------------------------------------------------
-- 3. Y la membresia los recibe al aceptar
-- ----------------------------------------------------------------------------
-- Con el nombre en la rama de condominio, que es lo que faltaba.

create or replace function public.aceptar_invitacion(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp, auth
as $fn$
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

  select lower(email) into v_correo_usuario from auth.users where id = auth.uid();
  if v_correo_usuario is distinct from lower(v_inv.correo) then
    raise exception 'Esta invitacion fue emitida para otro correo';
  end if;

  if v_inv.vigente_hasta is not null and v_inv.vigente_hasta < current_date then
    update public.invitacion set estado = 'expirada', updated_at = now() where id = v_inv.id;
    raise exception 'La estancia de esta invitacion ya termino';
  end if;

  if v_inv.ambito = 'unidad' then
    -- Local a la transaccion: se apaga sola al terminar.
    perform set_config('veciyo.alta_por_invitacion', 'on', true);

    insert into public.membresia_unidad (
      unidad_id, usuario_id, nombre, rol, vigente_desde, vigente_hasta,
      telefono, codigo_pais
    )
    values (
      v_inv.unidad_id, auth.uid(), v_inv.nombre, v_inv.rol_unidad,
      v_inv.vigente_desde, v_inv.vigente_hasta,
      v_inv.telefono, v_inv.codigo_pais
    )
    returning id into v_membresia_id;

    perform set_config('veciyo.alta_por_invitacion', 'off', true);

    update public.unidad
       set estado = 'aceptado', updated_at = now()
     where id = v_inv.unidad_id and estado in ('disponible', 'invitado');
  else
    /*
      El `nombre` es lo que faltaba. Sin el, la administracion escribia «Rosa
      Delgado» al invitar y la lista de coadministradores enseñaba «Sin
      nombre» en cuanto Rosa aceptaba.

      En el `do update` va tambien, pero **sin pisar lo que haya**: ese camino
      es para quien ya fue miembro y vuelve, y lo que tenga puesto la
      administracion vale mas que lo que decia una invitacion vieja.
    */
    insert into public.membresia_condominio (
      condominio_id, usuario_id, rol, nombre, telefono, codigo_pais
    )
    values (
      v_inv.condominio_id, auth.uid(), v_inv.rol_condominio,
      v_inv.nombre, v_inv.telefono, v_inv.codigo_pais
    )
    on conflict (condominio_id, usuario_id, rol) do update set
      activo = true,
      nombre = coalesce(public.membresia_condominio.nombre, excluded.nombre),
      telefono = coalesce(public.membresia_condominio.telefono, excluded.telefono),
      codigo_pais = coalesce(public.membresia_condominio.codigo_pais, excluded.codigo_pais)
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
$fn$;

comment on function public.aceptar_invitacion(text) is
  'Convierte una invitacion en membresia. Desde el 05/10/2026 copia tambien el nombre --que en la rama de condominio se perdia y dejaba «Sin nombre»-- y el telefono con su pais.';
