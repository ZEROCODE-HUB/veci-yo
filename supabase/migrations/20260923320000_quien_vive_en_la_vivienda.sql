-- ----------------------------------------------------------------------------
-- Quien vive en la vivienda
-- ----------------------------------------------------------------------------
-- La pantalla de Configuracion del propietario mostraba **tres personas
-- inventadas**, escritas a mano en `src/stores/propietario-store.ts`:
--
--   { id: 1, nombre: 'Alberto Manual', ci: '1782753580', ... }
--   { id: 2, nombre: 'Sofia Martinez', ci: '1759632584', ... }
--   { id: 3, nombre: 'Luis Torres',    ci: '1824507896', ... }
--
-- En el condominio de prueba la 301 tiene **una** residente, y la pantalla de
-- Invitar lo decia bien. La de Configuracion no consultaba nada: pintaba el
-- store, y sobre ese store operaban tambien el anfitrion primario, el
-- administrador primario y la declaracion de residencia del propietario. Todo
-- se perdia al recargar.
--
-- Y no era decorativo. `membresia_unidad.es_residente` sostiene
-- `es_residente_en_condominio`, que sostiene `audiencia_alcanza`: decide quien
-- ve los anuncios dirigidos "a residentes" y quien entra en el grupo de chat
-- de residentes. El KT lo da por decidido --"el Propietario se autodeclara
-- residente o no de su propia unidad" (21/07)-- y describe que esa declaracion
-- "vive en el store `propietario-store` (`residentesDeclarados`, mapa
-- correo->boolean)". Eso ultimo no es una decision de producto: es la
-- descripcion del codigo de entonces, y ademas usa el correo como clave, que
-- la regla 3 prohibe.
--
-- El esquema ya tenia **todo**: `es_anfitrion_primario`, `es_admin_primario`,
-- `es_residente`, con sus indices unicos parciales que impiden dos primarios
-- en la misma vivienda. Lo unico que faltaba era que alguien lo usara.

-- ----------------------------------------------------------------------------
-- Designar al anfitrion o al administrador primario
-- ----------------------------------------------------------------------------
-- Va en una funcion y no en un `update` del cliente por dos razones:
--
--   1. `membresia_unidad_un_anfitrion_primario` es un indice unico: para
--      designar a alguien hay que apagar antes al anterior. Dos llamadas
--      sueltas desde la app dejarian la vivienda sin anfitrion si la segunda
--      falla.
--   2. `proteger_membresia_unidad` impide que **nadie se cambie a si mismo**
--      `es_anfitrion_primario`, que es lo correcto como regla general. Pero el
--      propietario designandose anfitrion de su propia vivienda es legitimo, y
--      la pantalla lo ofrece. La autorizacion se comprueba aqui, una vez y de
--      forma explicita, en vez de abrir el disparador para todos.
create or replace function public.designar_primario(
  p_membresia_id uuid,
  p_cual         text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unidad uuid;
begin
  if p_cual not in ('anfitrion', 'administrador') then
    raise exception 'Solo se designa "anfitrion" o "administrador"';
  end if;

  select mu.unidad_id into v_unidad
  from public.membresia_unidad mu
  where mu.id = p_membresia_id and mu.activo;

  if v_unidad is null then
    raise exception 'Esa persona no esta activa en ninguna vivienda';
  end if;

  -- Quien gestiona a la gente de la vivienda: el propietario, el inquilino
  -- lider, o la administracion con permiso.
  if not public.puede_invitar_a_unidad(v_unidad) then
    raise exception 'No podes designar quien gestiona esta vivienda';
  end if;

  if p_cual = 'anfitrion' then
    update public.membresia_unidad
       set es_anfitrion_primario = false
     where unidad_id = v_unidad and es_anfitrion_primario and activo;
    update public.membresia_unidad
       set es_anfitrion_primario = true
     where id = p_membresia_id;
  else
    update public.membresia_unidad
       set es_admin_primario = false
     where unidad_id = v_unidad and es_admin_primario and activo;
    update public.membresia_unidad
       set es_admin_primario = true
     where id = p_membresia_id;
  end if;
end;
$$;

comment on function public.designar_primario(uuid, text) is
  'Designa al anfitrion o al administrador primario de una vivienda. Apaga al anterior en la misma operacion: el indice unico no admite dos.';

revoke all on function public.designar_primario(uuid, text) from public;
grant execute on function public.designar_primario(uuid, text) to authenticated;


-- ----------------------------------------------------------------------------
-- Declararse residente, o dejar de serlo
-- ----------------------------------------------------------------------------
-- La declaracion es **sobre uno mismo**: el propietario decide si vive o no en
-- su vivienda, y la pantalla explica que eso cambia lo que los demas ven
-- --"Solo quienes sean residentes tendran acceso al contenido de visitas,
-- correspondencia y zonas comunes"--. Se escribe en `es_residente`, que es lo
-- que `audiencia_alcanza` ya mira.
--
-- Nadie declara residente a otro: una persona no dice donde vive su vecino.
create or replace function public.declararse_residente(
  p_unidad_id uuid,
  p_valor     boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_afectadas integer;
begin
  update public.membresia_unidad
     set es_residente = p_valor
   where unidad_id = p_unidad_id
     and usuario_id = auth.uid()
     and activo
     -- El huesped temporal no se declara nada: su estancia dice lo que es.
     and rol <> 'huesped_temporal';

  get diagnostics v_afectadas = row_count;

  if v_afectadas = 0 then
    raise exception 'No tenes una membresia activa en esa vivienda';
  end if;
end;
$$;

comment on function public.declararse_residente(uuid, boolean) is
  'El propietario declara si vive o no en su vivienda. Solo sobre si mismo: `es_residente` decide que anuncios y que grupos de chat le llegan.';

revoke all on function public.declararse_residente(uuid, boolean) from public;
grant execute on function public.declararse_residente(uuid, boolean) to authenticated;


-- ----------------------------------------------------------------------------
-- Lo que cada residente comparte con los demas
-- ----------------------------------------------------------------------------
-- La tarjeta de cada residente muestra tres cosas --"Datos visibles", "Chat",
-- "WhatsApp"-- que no existian en ninguna tabla: salian del mismo store, con
-- `true` por defecto para todos. Son la preferencia de cada persona sobre lo
-- que comparte con quienes viven con ella, asi que viven en su membresia.
alter table public.membresia_unidad
  add column if not exists datos_visibles       boolean not null default true,
  add column if not exists contactable_chat     boolean not null default true,
  add column if not exists contactable_whatsapp boolean not null default true;

comment on column public.membresia_unidad.datos_visibles is
  'Si sus co-residentes ven su documento y su telefono. La pantalla lo mostraba desde un store en memoria, con `true` para todos.';

-- Y como es una afirmacion **sobre** alguien, esa persona la escribe y nadie
-- mas: quien gestiona la vivienda puede darte de alta y de baja, pero no
-- decidir por vos que compartis. La misma forma de `perfil.verificado`.
create or replace function public.proteger_visibilidad_de_membresia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if (new.datos_visibles       is distinct from old.datos_visibles
      or new.contactable_chat     is distinct from old.contactable_chat
      or new.contactable_whatsapp is distinct from old.contactable_whatsapp)
     -- Una membresia sin cuenta --un menor, alguien que todavia no acepto--
     -- no puede decidir por si misma, asi que la gestiona quien la registro.
     and old.usuario_id is not null
     and old.usuario_id <> auth.uid()
  then
    raise exception 'Cada quien decide que comparte con los demas de su vivienda'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists membresia_unidad_visibilidad on public.membresia_unidad;
create trigger membresia_unidad_visibilidad
  before update on public.membresia_unidad
  for each row execute function public.proteger_visibilidad_de_membresia();


-- ----------------------------------------------------------------------------
-- La proteccion del propietario era mas ancha de lo que decia
-- ----------------------------------------------------------------------------
-- `proteger_membresia_unidad` rechazaba **cualquier** cambio sobre una fila con
-- `rol = 'propietario'`:
--
--   if tg_op = 'UPDATE' and old.rol = 'propietario' then
--     raise exception 'Solo la administracion puede modificar la membresia del propietario';
--
-- La regla que hay que sostener es que **la propiedad de una vivienda la
-- registra la administracion**: no te la pones tu, no se la quitas a otro. Eso
-- es el rol, la cuenta a la que apunta y si esta activa. No es "esta fila no se
-- toca": el propietario declarando que vive en su casa, o eligiendo que
-- comparte con quienes viven con el, no esta tocando la propiedad de nada.
--
-- Es la misma forma que ya aparecio varias veces en este proyecto: una
-- condicion que contesta "¿de quien es esta fila?" cuando la pregunta era
-- "¿que estas cambiando?".
create or replace function public.proteger_membresia_unidad()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

  -- Y nadie se cambia a si mismo el rol ni sus propios permisos.
  if tg_op = 'UPDATE' and new.usuario_id = auth.uid() and (
       new.rol is distinct from old.rol
    or new.puede_acceder is distinct from old.puede_acceder
    or new.activo is distinct from old.activo
    or new.es_admin_primario is distinct from old.es_admin_primario
    or new.es_anfitrion_primario is distinct from old.es_anfitrion_primario
  ) then
    raise exception 'No podes cambiar tu propio rol ni tus propios permisos';
  end if;

  -- En un disparador `before delete`, devolver `new` es devolver NULL, y eso
  -- **cancela el borrado en silencio**: ni error, ni fila, ni pista.
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


-- `designar_primario` se anuncia con la bandera, igual que `aceptar_invitacion`.
create or replace function public.designar_primario(
  p_membresia_id uuid,
  p_cual         text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unidad uuid;
begin
  if p_cual not in ('anfitrion', 'administrador') then
    raise exception 'Solo se designa "anfitrion" o "administrador"';
  end if;

  select mu.unidad_id into v_unidad
  from public.membresia_unidad mu
  where mu.id = p_membresia_id and mu.activo;

  if v_unidad is null then
    raise exception 'Esa persona no esta activa en ninguna vivienda';
  end if;

  if not public.puede_invitar_a_unidad(v_unidad) then
    raise exception 'No podes designar quien gestiona esta vivienda';
  end if;

  perform set_config('veciyo.designando_primario', 'on', true);

  if p_cual = 'anfitrion' then
    update public.membresia_unidad
       set es_anfitrion_primario = false
     where unidad_id = v_unidad and es_anfitrion_primario and activo;
    update public.membresia_unidad
       set es_anfitrion_primario = true
     where id = p_membresia_id;
  else
    update public.membresia_unidad
       set es_admin_primario = false
     where unidad_id = v_unidad and es_admin_primario and activo;
    update public.membresia_unidad
       set es_admin_primario = true
     where id = p_membresia_id;
  end if;

  perform set_config('veciyo.designando_primario', 'off', true);
end;
$$;

revoke all on function public.designar_primario(uuid, text) from public;
grant execute on function public.designar_primario(uuid, text) to authenticated;
