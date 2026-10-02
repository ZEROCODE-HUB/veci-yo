-- ----------------------------------------------------------------------------
-- Lo que el panel de la plataforma puede pedir
-- ----------------------------------------------------------------------------
-- Todo lo que el dueño de la plataforma ve pasa por aquí, y nada más. No hay
-- una política `or es_staff_plataforma()` sobre las tablas del dominio: el
-- alcance se decidió como «lo de la plataforma y nada de los vecinos», y la
-- única forma de que eso se sostenga es que la lista de lo que puede pedir sea
-- **finita y esté escrita en un sitio**.
--
-- Cada función empieza comprobando el rol. Son `security definer`, así que si
-- una se olvidara de comprobarlo, entregaría el dato a cualquiera: es la razón
-- de que la comprobación sea la primera línea de todas y no un detalle.

-- ----------------------------------------------------------------------------
-- panel_resumen · los cuatro números de la portada
-- ----------------------------------------------------------------------------

create or replace function public.panel_resumen()
returns table (
  condominios          bigint,
  viviendas            bigint,
  cuentas              bigint,
  reclamos_app_abiertos bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Esto es del panel de la plataforma';
  end if;

  return query
  select
    (select count(*) from public.condominio c where c.deleted_at is null),
    (select count(*) from public.unidad u where u.deleted_at is null),
    -- Cuentas, no personas: una persona registrada sin cuenta --un menor-- no
    -- usa la plataforma, así que no cuenta como usuario de ella.
    (select count(*) from auth.users),
    (select count(*) from public.reclamo r
      where r.area = 'aplicacion' and r.estado <> 'resuelto');
end;
$$;


-- ----------------------------------------------------------------------------
-- panel_condominios · la lista de edificios, en conteos
-- ----------------------------------------------------------------------------
-- Conteos y nada más. Ni un nombre de vecino, ni una dirección de vivienda.
-- `direccion` del edificio sí: es la del inmueble, y hace falta para saber de
-- qué edificio se habla cuando dos se llaman parecido.

create or replace function public.panel_condominios()
returns table (
  id                uuid,
  nombre            text,
  direccion         text,
  ciudad            text,
  pais              char(2),
  moneda            char(3),
  torres            bigint,
  viviendas         bigint,
  personas          bigint,
  administradores   bigint,
  guardias          bigint,
  reclamos_abiertos bigint,
  creado_en         timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Esto es del panel de la plataforma';
  end if;

  return query
  select
    c.id, c.nombre, c.direccion, c.ciudad, c.pais, c.moneda,
    (select count(*) from public.torre t where t.condominio_id = c.id),
    (select count(*) from public.unidad u
      where u.condominio_id = c.id and u.deleted_at is null),
    -- Quien de verdad entra: con cuenta y con acceso. Se cuenta la persona una
    -- vez aunque tenga dos viviendas en el mismo edificio.
    (select count(distinct mu.usuario_id)
       from public.membresia_unidad mu
       join public.unidad u2 on u2.id = mu.unidad_id
      where u2.condominio_id = c.id
        and mu.activo and mu.puede_acceder and mu.usuario_id is not null),
    (select count(*) from public.membresia_condominio mc
      where mc.condominio_id = c.id and mc.activo
        and mc.rol in ('administrador', 'coadministrador')),
    (select count(*) from public.membresia_condominio mc
      where mc.condominio_id = c.id and mc.activo and mc.rol = 'guardia'),
    -- Las del edificio, no las de la aplicación: sirve para saber si un
    -- edificio está desatendido, que es información de operación.
    (select count(*) from public.reclamo r
      where r.condominio_id = c.id
        and r.area <> 'aplicacion' and r.estado <> 'resuelto'),
    c.created_at
  from public.condominio c
  where c.deleted_at is null
  order by c.nombre;
end;
$$;


-- ----------------------------------------------------------------------------
-- panel_reclamos_app · las quejas sobre la aplicación
-- ----------------------------------------------------------------------------
-- La tabla ya se puede leer con la política nueva. Esta función existe por lo
-- que la política no puede dar: el nombre de quien escribió y el del edificio
-- desde el que escribió. Sin eso, soporte lee «alguien, en algún sitio, dice
-- que la app se cierra».
--
-- El correo y el teléfono salen de `correo_contacto` y `telefono_contacto`, que
-- es lo que la propia persona puso en el formulario para que la contactaran. No
-- se va a buscar su correo real a `auth.users`: pedir ayuda no es autorizar que
-- se saque el resto de la ficha.

create or replace function public.panel_reclamos_app()
returns table (
  id                 uuid,
  numero             text,
  tipo               public.tipo_reclamo,
  categoria          public.categoria_reclamo,
  titulo             text,
  descripcion        text,
  estado             public.estado_reclamo,
  resolucion         text,
  modelo_dispositivo text,
  correo_contacto    text,
  telefono_contacto  text,
  medio_preferido    public.medio_contacto,
  autor              text,
  condominio         text,
  creado_en          timestamptz,
  resuelto_en        timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Esto es del panel de la plataforma';
  end if;

  return query
  select
    r.id, r.numero, r.tipo, r.categoria, r.titulo, r.descripcion,
    r.estado, r.resolucion, r.modelo_dispositivo,
    r.correo_contacto, r.telefono_contacto, r.medio_contacto_preferido,
    coalesce(trim(p.nombre || ' ' || p.apellido), 'Cuenta eliminada'),
    c.nombre,
    r.created_at, r.resuelto_en
  from public.reclamo r
  left join public.perfil p on p.id = r.creado_por
  join public.condominio c on c.id = r.condominio_id
  where r.area = 'aplicacion'
  -- Lo que falta por atender primero, y dentro de eso lo más viejo arriba: es
  -- quien lleva más tiempo esperando.
  order by (r.estado = 'resuelto'), r.created_at;
end;
$$;


-- ----------------------------------------------------------------------------
-- panel_responder_reclamo · contestar una queja de la aplicación
-- ----------------------------------------------------------------------------

create or replace function public.panel_responder_reclamo(
  p_reclamo_id uuid,
  p_resolucion text,
  p_estado     public.estado_reclamo
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_area public.area_reclamo;
begin
  if not public.es_staff_plataforma() then
    raise exception 'Esto es del panel de la plataforma';
  end if;

  select area into v_area from public.reclamo where id = p_reclamo_id;

  if v_area is null then
    raise exception 'Esa PQRS no existe';
  end if;

  -- El límite, otra vez y desde dentro: el panel no toca las quejas del
  -- edificio aunque alguien le pase el identificador de una.
  if v_area <> 'aplicacion' then
    raise exception 'Esa PQRS es del edificio, no de la aplicacion';
  end if;

  -- `reclamo_resuelto_con_actor` exige que si queda resuelta, se sepa quién y
  -- cuándo. Se cumple aquí y no se deja al cliente.
  update public.reclamo
     set resolucion  = nullif(trim(p_resolucion), ''),
         estado      = p_estado,
         resuelto_por = case when p_estado = 'resuelto' then auth.uid() else null end,
         resuelto_en  = case when p_estado = 'resuelto' then now() else null end,
         updated_at   = now()
   where id = p_reclamo_id;

  perform public.anotar_en_bitacora(
    'reclamo_app_respondido',
    null,
    jsonb_build_object('reclamo_id', p_reclamo_id, 'estado', p_estado)
  );
end;
$$;


-- ----------------------------------------------------------------------------
-- panel_crear_condominio · dar de alta un edificio
-- ----------------------------------------------------------------------------
-- `condominio` no tiene política de INSERT: desde una sesión no se puede crear
-- uno, y eso está bien. Esta función es el único camino, y deja rastro.
--
-- No crea al administrador: lo **invita**. Una cuenta se la hace su dueño con
-- su contraseña; la plataforma no crea cuentas de otros ni les elige la clave.

create or replace function public.panel_crear_condominio(
  p_nombre       text,
  p_direccion    text,
  p_pais         char(2),
  p_ciudad       text default null,
  p_moneda       char(3) default 'COP',
  p_correo_admin text default null,
  p_nombre_admin text default null
)
returns table (condominio_id uuid, invitacion_id uuid, token text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_condominio uuid;
  v_invitacion uuid;
  v_token      text;
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma da de alta un edificio';
  end if;

  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'El edificio necesita un nombre';
  end if;
  if coalesce(trim(p_direccion), '') = '' then
    raise exception 'El edificio necesita una direccion';
  end if;
  if p_pais is null then
    raise exception 'El edificio necesita un pais';
  end if;

  insert into public.condominio (nombre, direccion, pais, ciudad, moneda)
  values (trim(p_nombre), trim(p_direccion), upper(p_pais),
          nullif(trim(p_ciudad), ''), upper(coalesce(p_moneda, 'COP')))
  returning id into v_condominio;

  perform public.anotar_en_bitacora(
    'condominio_creado', v_condominio,
    jsonb_build_object('nombre', trim(p_nombre))
  );

  if coalesce(trim(p_correo_admin), '') <> '' then
    select i.invitacion_id, i.token
      into v_invitacion, v_token
      from public.invitar_primer_administrador(
        v_condominio, p_correo_admin, coalesce(nullif(trim(p_nombre_admin), ''), 'Administración')
      ) i;
  end if;

  return query select v_condominio, v_invitacion, v_token;
end;
$$;


-- ----------------------------------------------------------------------------
-- invitar_primer_administrador · el único hueco por el que la plataforma entra
-- ----------------------------------------------------------------------------
-- `crear_invitacion` exige `es_admin_condominio` para los roles de condominio,
-- y el dueño de la plataforma no es administrador de ningún edificio. Así que
-- necesita su propia puerta, y esa puerta es la parte más delicada de todo
-- esto: quien pueda invitar a un administrador puede invitarse a sí mismo y
-- entrar a ver todo.
--
-- Por eso solo funciona en un edificio **sin ningún administrador**. Un
-- edificio recién creado lo está; uno en marcha, no. Es un hueco que se cierra
-- solo en cuanto el edificio tiene dueño, y que se puede volver a abrir si la
-- primera invitación caduca sin que nadie la acepte.
--
-- La alternativa --añadir `or es_staff_plataforma()` a `crear_invitacion`--
-- habría sido una línea, y habría dejado a la plataforma invitándose como
-- administradora de cualquier edificio con vecinos dentro.

create or replace function public.invitar_primer_administrador(
  p_condominio_id uuid,
  p_correo        text,
  p_nombre        text
)
returns table (invitacion_id uuid, token text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token  text := encode(extensions.gen_random_bytes(32), 'hex');
  v_correo text := lower(trim(p_correo));
  v_id     uuid;
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma hace esto';
  end if;

  if not exists (select 1 from public.condominio where id = p_condominio_id) then
    raise exception 'Ese edificio no existe';
  end if;

  if exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.activo
      and mc.rol in ('administrador', 'coadministrador')
  ) then
    raise exception 'Ese edificio ya tiene administracion: pidesela a ella';
  end if;

  if v_correo = '' or v_correo not like '%_@_%._%' then
    raise exception 'Ese correo no sirve';
  end if;

  -- Una sola invitación de administrador viva por edificio. Sin esto, cada
  -- intento deja otro token válido en circulación.
  update public.invitacion
     set estado = 'revocada', updated_at = now()
   where condominio_id = p_condominio_id
     and ambito = 'condominio'
     and rol_condominio = 'administrador'
     and estado = 'pendiente';

  insert into public.invitacion (
    condominio_id, ambito, rol_condominio, correo, nombre,
    token_hash, invitada_por, expira_en
  ) values (
    p_condominio_id, 'condominio', 'administrador', v_correo, trim(p_nombre),
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    auth.uid(), now() + interval '14 days'
  )
  returning id into v_id;

  perform public.anotar_en_bitacora(
    'primer_administrador_invitado', p_condominio_id,
    jsonb_build_object('correo', v_correo)
  );

  return query select v_id, v_token;
end;
$$;


-- ----------------------------------------------------------------------------
-- El equipo de la plataforma
-- ----------------------------------------------------------------------------

create or replace function public.panel_staff()
returns table (
  usuario_id uuid,
  nombre     text,
  rol        public.rol_plataforma,
  activo     boolean,
  nota       text,
  creado_en  timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Esto es del panel de la plataforma';
  end if;

  return query
  select sp.usuario_id,
         coalesce(trim(p.nombre || ' ' || p.apellido), 'Sin perfil'),
         sp.rol, sp.activo, sp.nota, sp.created_at
  from public.staff_plataforma sp
  left join public.perfil p on p.id = sp.usuario_id
  order by sp.rol, sp.created_at;
end;
$$;

-- Para dar el rol hay que saber a quién. La regla 3 prohíbe usar el correo como
-- clave, y no se usa: esto devuelve el `id`, que es la identidad, y el correo
-- solo sirve para encontrarlo y para que quien lo da confirme que es la persona
-- que cree. Solo el dueño, porque es buscar cuentas por correo.
create or replace function public.panel_buscar_cuenta(p_correo text)
returns table (usuario_id uuid, nombre text, ya_es_staff boolean)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma busca cuentas';
  end if;

  return query
  select u.id,
         coalesce(trim(p.nombre || ' ' || p.apellido), 'Sin perfil'),
         exists (select 1 from public.staff_plataforma sp where sp.usuario_id = u.id)
  from auth.users u
  left join public.perfil p on p.id = u.id
  where lower(u.email) = lower(trim(p_correo));
end;
$$;

create or replace function public.panel_dar_rol_plataforma(
  p_usuario_id uuid,
  p_rol        public.rol_plataforma,
  p_nota       text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- El disparador de `staff_plataforma` ya lo impide, y se comprueba también
  -- aquí para que el mensaje diga lo que pasa en vez de hablar de un trigger.
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma reparte este rol';
  end if;
  if p_usuario_id = auth.uid() then
    raise exception 'Nadie se cambia su propio rol de plataforma';
  end if;
  if not exists (select 1 from auth.users where id = p_usuario_id) then
    raise exception 'Esa cuenta no existe';
  end if;

  insert into public.staff_plataforma (usuario_id, rol, nota, creado_por)
  values (p_usuario_id, p_rol, nullif(trim(p_nota), ''), auth.uid())
  on conflict (usuario_id) do update
    set rol = excluded.rol,
        activo = true,
        nota = excluded.nota,
        updated_at = now();

  perform public.anotar_en_bitacora(
    'rol_plataforma_dado', null,
    jsonb_build_object('usuario_id', p_usuario_id, 'rol', p_rol)
  );
end;
$$;

-- Se desactiva, no se borra: la bitácora apunta a esta persona y un rol que
-- desaparece deja líneas de un actor que nunca existió.
create or replace function public.panel_quitar_rol_plataforma(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.es_dueno_plataforma() then
    raise exception 'Solo el dueño de la plataforma reparte este rol';
  end if;
  if p_usuario_id = auth.uid() then
    raise exception 'Nadie se cambia su propio rol de plataforma';
  end if;

  -- Que no quede la plataforma sin nadie que pueda repartir el rol: el único
  -- camino de vuelta sería la clave de servicio.
  if exists (
    select 1 from public.staff_plataforma
    where usuario_id = p_usuario_id and rol = 'dueno' and activo
  ) and (
    select count(*) from public.staff_plataforma
    where rol = 'dueno' and activo
  ) <= 1 then
    raise exception 'Es el ultimo dueño de la plataforma: nombra a otro antes de quitarlo';
  end if;

  update public.staff_plataforma
     set activo = false, updated_at = now()
   where usuario_id = p_usuario_id;

  perform public.anotar_en_bitacora(
    'rol_plataforma_quitado', null,
    jsonb_build_object('usuario_id', p_usuario_id)
  );
end;
$$;


-- ----------------------------------------------------------------------------
-- panel_bitacora · lo que se ha hecho
-- ----------------------------------------------------------------------------

create or replace function public.panel_bitacora(p_limite integer default 100)
returns table (
  id         uuid,
  accion     text,
  actor      text,
  condominio text,
  detalle    jsonb,
  creado_en  timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.es_staff_plataforma() then
    raise exception 'Esto es del panel de la plataforma';
  end if;

  return query
  select b.id, b.accion,
         coalesce(trim(p.nombre || ' ' || p.apellido), 'Cuenta eliminada'),
         c.nombre, b.detalle, b.created_at
  from public.bitacora_plataforma b
  left join public.perfil p on p.id = b.actor_id
  left join public.condominio c on c.id = b.condominio_id
  order by b.created_at desc
  limit least(greatest(coalesce(p_limite, 100), 1), 500);
end;
$$;
