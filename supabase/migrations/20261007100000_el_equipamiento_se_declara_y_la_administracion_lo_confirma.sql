-- El equipamiento de la renta corta: lo declara el anfitrión, lo confirma el edificio
--
-- Qué estaba pasando (REVISAR-A-OJO 174)
-- --------------------------------------
-- Hay tres casillas en la configuración del alojamiento --antirruido, no fumar
-- y sensor-- y el comentario de las tres decía, desde el 22/09/2026:
--
--     «Lo confirma la administración al verificar, no el anfitrión.»
--
-- Las dos columnas que respaldarían esa verificación --`verificada_en` y
-- `verificada_por`-- **no las escribía nadie**, y quien enciende los tres
-- interruptores es el anfitrión, desde su propia pantalla. O sea: una
-- declaración del propio interesado presentada como un hecho comprobado por el
-- edificio, y a un huésped que lee «sensor de incendio» eso le importa.
--
-- Es la novena de la familia de «la decisión vivía en la pantalla, no en el
-- dato», con un agravante: aquí **el comentario de la base afirmaba lo
-- contrario de lo que hacía el código**, que es la trampa que deja al
-- siguiente que lo lea creyendo que alguien verifica.
--
-- Lo que decidió el cliente el 07/10/2026, de las tres opciones que se le
-- plantearon: la intermedia. **Lo enciende el anfitrión --es quien sabe qué
-- tiene-- y se muestra como declarado hasta que la administración lo
-- confirme.** Ni bloquear la publicación hasta que alguien suba a mirar, ni
-- dejar que una declaración pase por verificada.
--
-- Las tres piezas
-- ---------------
--   1. los comentarios, que hoy mienten;
--   2. `verificar_equipamiento`, que es lo único que escribe las dos columnas
--      de la verificación, y solo para la administración del edificio;
--   3. un disparador que **caduca la verificación** en cuanto el anfitrión
--      toca cualquiera de las tres casillas.
--
-- La tercera es la que de verdad sostiene la distinción. Sin ella: la
-- administración sube, comprueba que hay sensor, confirma; el anfitrión
-- enciende después las otras dos, y las tres salen verificadas con la fecha de
-- la visita en que solo se miró una. Un sello que no se invalida al cambiar lo
-- sellado no vale nada.

-- 1. Lo que de verdad significan estas cinco columnas ------------------------

comment on column public.suscripcion_renta_corta.tiene_antirruido is
  'Dispositivo antirruido. **Lo declara el anfitrión**, que es quien sabe qué '
  'tiene. `verificada_en` dice si la administración lo comprobó; sin fecha, es '
  'solo una declaración y así se enseña.';

comment on column public.suscripcion_renta_corta.tiene_no_fumar is
  'Señalética de no fumar. Lo declara el anfitrión; lo confirma la '
  'administración con `verificar_equipamiento`.';

comment on column public.suscripcion_renta_corta.tiene_sensor is
  'Sensor de incendio, gas o CO2. Lo declara el anfitrión; lo confirma la '
  'administración con `verificar_equipamiento`.';

comment on column public.suscripcion_renta_corta.verificada_en is
  'Cuándo comprobó la administración el equipamiento declarado. Null es el '
  'caso normal: significa «declarado, sin comprobar». **Se borra sola en '
  'cuanto el anfitrión cambia cualquiera de las tres casillas**, porque lo '
  'verificado era lo de antes.';

comment on column public.suscripcion_renta_corta.verificada_por is
  'Quién la comprobó. Es la persona a la que se le pregunta si un huésped '
  'reclama, así que no se borra al caducar la fecha salvo con ella.';

-- 2. La verificación la escribe una sola función, y solo la administración ---

create or replace function public.verificar_equipamiento(
  p_unidad_id uuid,
  p_verificada boolean default true
)
returns timestamptz
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid;
  v_cuando timestamptz;
begin
  select u.condominio_id into v_condominio
  from public.unidad u
  where u.id = p_unidad_id and u.deleted_at is null;

  if v_condominio is null then
    raise exception 'Esa vivienda no existe';
  end if;

  /*
    Comprueba quién llama **por dentro**. La función es `security definer` para
    poder escribir dos columnas que ninguna política deja tocar a nadie --ni al
    anfitrión, que es justo el punto-- así que la comprobación no la puede
    hacer RLS.

    `es_admin_condominio` y no `gestiona_la_vivienda`: el segundo incluye al
    propietario y al inquilino líder, que son los interesados. Antes de
    reutilizar un ayudante de permisos hay que leer qué incluye, no cómo se
    llama.
  */
  if not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administración del edificio verifica el equipamiento';
  end if;

  v_cuando := case when p_verificada then now() end;

  update public.suscripcion_renta_corta s
     set verificada_en  = v_cuando,
         verificada_por = case when p_verificada then auth.uid() end
   where s.unidad_id = p_unidad_id;

  if not found then
    raise exception 'Esa vivienda no tiene renta corta configurada';
  end if;

  return v_cuando;
end;
$$;

comment on function public.verificar_equipamiento(uuid, boolean) is
  'La administración del edificio deja constancia de que subió a comprobar el '
  'equipamiento declarado, o la retira con false. Es lo único que escribe '
  '`verificada_en` y `verificada_por`.';

-- 3. Y caduca en cuanto cambia lo que se verificó ----------------------------

create or replace function public.caducar_verificacion_de_equipamiento()
returns trigger
language plpgsql
as $$
begin
  /*
    Solo cuando el cambio viene de otro sitio. `verificar_equipamiento` no
    toca los tres booleanos, así que la condición `when` del disparador ya la
    deja fuera; esto es el cinturón por si algún día alguien escribe las dos
    cosas a la vez.
  */
  if new.verificada_en is not distinct from old.verificada_en then
    new.verificada_en  := null;
    new.verificada_por := null;
  end if;
  return new;
end;
$$;

comment on function public.caducar_verificacion_de_equipamiento() is
  'Borra la verificación cuando el anfitrión cambia lo que se había '
  'verificado. Un sello que no se invalida al cambiar lo sellado no vale nada.';

drop trigger if exists suscripcion_caducar_verificacion on public.suscripcion_renta_corta;

create trigger suscripcion_caducar_verificacion
  before update on public.suscripcion_renta_corta
  for each row
  when (
    old.tiene_antirruido is distinct from new.tiene_antirruido
    or old.tiene_no_fumar is distinct from new.tiene_no_fumar
    or old.tiene_sensor is distinct from new.tiene_sensor
  )
  execute function public.caducar_verificacion_de_equipamiento();

-- 4. La lista dice también quién verificó ------------------------------------
--
-- `verificada_por` existe desde el primer día para poder preguntarle a alguien
-- si un huésped reclama, y no salía de la base. Un `uuid` no sirve de nada en
-- una pantalla, así que lo que viaja es el nombre.
--
-- Hay que borrarla y rehacerla porque cambia su `returns table`: un
-- `create or replace` con otra forma de salida no reemplaza, falla.

drop function if exists public.unidades_renta_corta(uuid, boolean);

create function public.unidades_renta_corta(
  p_condominio_id uuid,
  p_como_personal boolean default true
)
returns table (
  unidad_id uuid,
  codigo text,
  torre_numero integer,
  piso integer,
  estado text,
  anfitrion text,
  anfitrion_tel text,
  propietario text,
  propietario_tel text,
  administrador text,
  administrador_tel text,
  permite_mascotas boolean,
  tiene_antirruido boolean,
  tiene_no_fumar boolean,
  tiene_sensor boolean,
  verificada_en timestamptz,
  verificada_por_nombre text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with quien as (
    select
      m.unidad_id,
      max(m.nombre)   filter (where m.es_anfitrion_primario) as anfitrion,
      max(m.telefono) filter (where m.es_anfitrion_primario) as anfitrion_tel,
      max(m.nombre)   filter (where m.rol = 'propietario')   as propietario,
      max(m.telefono) filter (where m.rol = 'propietario')   as propietario_tel,
      max(m.nombre)   filter (where m.es_admin_primario)     as administrador,
      max(m.telefono) filter (where m.es_admin_primario)     as administrador_tel
    from public.membresia_unidad m
    where m.activo
    group by m.unidad_id
  )
  select
    u.id,
    case when visible.ok then u.codigo end,
    t.numero,
    case when visible.ok then u.piso end,
    case s.estado
      when 'activa'    then 'Inscripto'
      when 'vencida'   then 'Pendiente'
      when 'cancelada' then 'No inscripto'
    end,
    q.anfitrion,
    case when contacto.ok then q.anfitrion_tel end,
    q.propietario,
    case when contacto.ok then q.propietario_tel end,
    q.administrador,
    q.administrador_tel,
    coalesce(pv.corta_permite_mascotas, false),
    s.tiene_antirruido,
    s.tiene_no_fumar,
    s.tiene_sensor,
    s.verificada_en,
    -- Sin fecha no hay verificación vigente, así que el nombre tampoco se
    -- enseña: lo que queda en la columna es constancia de la anterior.
    case when s.verificada_en is not null then
      nullif(trim(coalesce(pr.nombre, '') || ' ' || coalesce(pr.apellido, '')), '')
    end
  from public.suscripcion_renta_corta s
  join public.unidad u on u.id = s.unidad_id
  join public.torre t on t.id = u.torre_id
  left join quien q on q.unidad_id = u.id
  left join public.permiso_vivienda pv on pv.unidad_id = u.id
  left join public.perfil pr on pr.id = s.verificada_por
  cross join lateral (
    select
      public.es_miembro_unidad(u.id)
      or (p_como_personal and public.es_personal_condominio(p_condominio_id))
      as privilegiado
  ) rol
  cross join lateral (
    select (not s.ocultar_numero) or rol.privilegiado as ok
  ) visible
  cross join lateral (
    select (not s.ocultar_contacto) or rol.privilegiado as ok
  ) contacto
  where u.condominio_id = p_condominio_id
    and u.deleted_at is null
    and public.es_miembro_condominio(p_condominio_id)
  order by t.numero, u.codigo;
$$;

comment on function public.unidades_renta_corta(uuid, boolean) is
  'Las viviendas de renta corta del edificio, con su equipamiento declarado y '
  'quién lo verificó, si alguien lo hizo.';
