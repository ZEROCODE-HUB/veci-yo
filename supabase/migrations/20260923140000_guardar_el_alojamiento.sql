-- ----------------------------------------------------------------------------
-- "Guardar configuracion" guarda
-- ----------------------------------------------------------------------------
-- La pantalla "Conf. Huespedes Temporales" es la mas larga del producto —
-- aforo, minimo de noches, mascotas, niños, descripcion, habitaciones,
-- estacionamientos, plataformas, PMS, iCal, politica de visitas, RNT, los
-- sellos de confianza y el libro del alojamiento con el wifi y la contrasena
-- de la puerta— y su boton hacia esto:
--
--   const handleGuardar = () => {
--     addToast("Configuracion guardada exitosamente", "success");
--     navigation.goBack();
--   };
--
-- Nada. Ni una escritura. Se anunciaba el exito y se tiraba todo, incluidas
-- las credenciales de entrada a la vivienda, que es justo lo que un huesped
-- viene a buscar.
--
-- ----------------------------------------------------------------------------
-- Donde va cada cosa (R-50)
-- ----------------------------------------------------------------------------
-- `config_renta_corta` se creo al migrar el dominio duplicando lo que ya vivia
-- en otras tres tablas. Esta vacia y no la consulta nadie. En vez de dejarla
-- como tercera copia, sus campos propios —los que el anfitrion decide sobre su
-- anuncio— se consolidan en `suscripcion_renta_corta`, que es la fila que ya
-- representa "esta vivienda hace renta corta", y la tabla desaparece.
--
-- Queda asi, y son tres cosas distintas que antes se confundian:
--
--   * `permiso_vivienda`          -> lo que el EDIFICIO permite (techo).
--   * `suscripcion_renta_corta`   -> lo que el ANFITRION ofrece (dentro del techo).
--   * `libro_huesped`             -> lo que el HUESPED necesita al llegar.
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'visitas_de_huesped') then
    create type public.visitas_de_huesped as enum (
      'permitir_todos',
      'prohibir_todos',
      'aprobar_cada_uno'
    );
  end if;
end
$$;

alter table public.suscripcion_renta_corta
  add column if not exists estancia_minima_noches integer,
  add column if not exists estancia_maxima_noches integer,
  -- Lo que el anfitrion ofrece. El techo lo pone `permiso_vivienda`: si el
  -- edificio no admite mascotas, ofrecerlas no las autoriza.
  add column if not exists permite_mascotas    boolean,
  add column if not exists apto_ninos          boolean,
  add column if not exists visitas_de_huespedes public.visitas_de_huesped,
  add column if not exists rnt                 text,
  add column if not exists publicado_airbnb    boolean not null default false,
  add column if not exists publicado_booking   boolean not null default false,
  add column if not exists otras_plataformas   text,
  add column if not exists pms                 text,
  add column if not exists ical_url            text;

alter table public.suscripcion_renta_corta
  drop constraint if exists suscripcion_estancia_coherente;
alter table public.suscripcion_renta_corta
  add constraint suscripcion_estancia_coherente
  check (
    estancia_minima_noches is null
    or estancia_maxima_noches is null
    or estancia_maxima_noches >= estancia_minima_noches
  );

comment on column public.suscripcion_renta_corta.permite_mascotas is
  'Lo que el anfitrion ofrece. El techo lo pone permiso_vivienda, que es del edificio.';

drop table if exists public.config_renta_corta;


-- ----------------------------------------------------------------------------
-- La ficha que ve el huesped
-- ----------------------------------------------------------------------------
-- Leia los permisos con `coalesce(..., false)`, o sea "si nadie lo dijo, no se
-- permite". Desde 20260923130000 el criterio es el contrario y esta escrito en
-- `reglas_de_estancia`. Y lo que se le ofrece al huesped es lo que el anfitrion
-- ofrece **limitado por** lo que el edificio permite: las dos cosas, no una.
create or replace function public.ficha_alojamiento(p_unidad_id uuid)
returns table (
  descripcion       text,
  num_habitaciones  integer,
  max_huespedes     integer,
  estacionamientos  integer,
  permite_mascotas  boolean,
  apto_ninos        boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    coalesce(s.descripcion, ''),
    coalesce(t.habitaciones, 0),
    coalesce(s.max_huespedes, 0),
    s.estacionamientos_huesped,
    coalesce(s.permite_mascotas, true) and coalesce(r.permite_mascotas, true),
    coalesce(s.apto_ninos, true)       and coalesce(r.permite_ninos, true)
  from public.unidad u
  join public.suscripcion_renta_corta s on s.unidad_id = u.id
  left join public.tipologia t on t.id = u.tipologia_id
  cross join lateral public.reglas_de_estancia(u.id) r
  where u.id = p_unidad_id
    and (
      public.puede_operar_unidad(p_unidad_id)
      or public.es_huesped_con_reserva(p_unidad_id)
    );
$$;


-- ----------------------------------------------------------------------------
-- Guardar el alojamiento
-- ----------------------------------------------------------------------------
-- Una sola llamada porque es un solo boton: si la descripcion se guardara y el
-- libro no, el anfitrion se iria creyendo que dejo puesto el wifi.
--
-- Las contrasenas van a Vault. La tabla solo guarda el identificador del
-- secreto, asi que ni leyendo `libro_huesped` entero salen en claro.
create or replace function public.guardar_alojamiento(
  p_unidad_id              uuid,
  p_descripcion            text    default null,
  p_max_huespedes          integer default null,
  p_estacionamientos       integer default null,
  p_estancia_minima        integer default null,
  p_estancia_maxima        integer default null,
  p_permite_mascotas       boolean default null,
  p_apto_ninos             boolean default null,
  p_visitas_de_huespedes   text    default null,
  p_rnt                    text    default null,
  p_publicado_airbnb       boolean default null,
  p_publicado_booking      boolean default null,
  p_otras_plataformas      text    default null,
  p_pms                    text    default null,
  p_ical_url               text    default null,
  p_tiene_antirruido       boolean default null,
  p_tiene_no_fumar         boolean default null,
  p_tiene_sensor           boolean default null,
  p_ocultar_numero         boolean default null,
  p_wifi_nombre            text    default null,
  p_wifi_password          text    default null,
  p_puerta_password        text    default null,
  p_instrucciones          text    default null,
  p_notas                  text    default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp, vault
as $$
declare
  v_libro       public.libro_huesped;
  v_wifi_id     uuid;
  v_puerta_id   uuid;
begin
  if not public.puede_operar_unidad(p_unidad_id) then
    raise exception 'No podes configurar el alojamiento de esta vivienda';
  end if;

  update public.suscripcion_renta_corta set
    descripcion              = coalesce(p_descripcion, descripcion),
    max_huespedes            = coalesce(p_max_huespedes, max_huespedes),
    estacionamientos_huesped = coalesce(p_estacionamientos, estacionamientos_huesped),
    estancia_minima_noches   = coalesce(p_estancia_minima, estancia_minima_noches),
    estancia_maxima_noches   = coalesce(p_estancia_maxima, estancia_maxima_noches),
    permite_mascotas         = coalesce(p_permite_mascotas, permite_mascotas),
    apto_ninos               = coalesce(p_apto_ninos, apto_ninos),
    visitas_de_huespedes     = coalesce(
                                 p_visitas_de_huespedes::public.visitas_de_huesped,
                                 visitas_de_huespedes),
    rnt                      = coalesce(p_rnt, rnt),
    publicado_airbnb         = coalesce(p_publicado_airbnb, publicado_airbnb),
    publicado_booking        = coalesce(p_publicado_booking, publicado_booking),
    otras_plataformas        = coalesce(p_otras_plataformas, otras_plataformas),
    pms                      = coalesce(p_pms, pms),
    ical_url                 = coalesce(p_ical_url, ical_url),
    tiene_antirruido         = coalesce(p_tiene_antirruido, tiene_antirruido),
    tiene_no_fumar           = coalesce(p_tiene_no_fumar, tiene_no_fumar),
    tiene_sensor             = coalesce(p_tiene_sensor, tiene_sensor),
    ocultar_numero           = coalesce(p_ocultar_numero, ocultar_numero)
  where unidad_id = p_unidad_id;

  if not found then
    raise exception 'Esta vivienda no tiene una suscripcion de renta corta';
  end if;

  select * into v_libro from public.libro_huesped where unidad_id = p_unidad_id;

  if v_libro.id is null then
    insert into public.libro_huesped (unidad_id) values (p_unidad_id)
    returning * into v_libro;
  end if;

  -- Una contrasena vacia no borra la que hay: el formulario llega vacio
  -- porque no se puede releer, no porque se quiera quitar.
  if nullif(btrim(coalesce(p_wifi_password, '')), '') is not null then
    if v_libro.wifi_password_secret is null then
      v_wifi_id := vault.create_secret(
        p_wifi_password, 'wifi_' || p_unidad_id::text, 'Clave del wifi del alojamiento');
    else
      perform vault.update_secret(v_libro.wifi_password_secret, p_wifi_password);
      v_wifi_id := v_libro.wifi_password_secret;
    end if;
  else
    v_wifi_id := v_libro.wifi_password_secret;
  end if;

  if nullif(btrim(coalesce(p_puerta_password, '')), '') is not null then
    if v_libro.puerta_password_secret is null then
      v_puerta_id := vault.create_secret(
        p_puerta_password, 'puerta_' || p_unidad_id::text, 'Clave de la puerta del alojamiento');
    else
      perform vault.update_secret(v_libro.puerta_password_secret, p_puerta_password);
      v_puerta_id := v_libro.puerta_password_secret;
    end if;
  else
    v_puerta_id := v_libro.puerta_password_secret;
  end if;

  update public.libro_huesped set
    wifi_nombre            = coalesce(p_wifi_nombre, wifi_nombre),
    instrucciones          = coalesce(p_instrucciones, instrucciones),
    notas                  = coalesce(p_notas, notas),
    wifi_password_secret   = v_wifi_id,
    puerta_password_secret = v_puerta_id
  where id = v_libro.id;
end;
$$;

comment on function public.guardar_alojamiento is
  'Guarda lo que el anfitrion configura de su alojamiento. Antes el boton solo mostraba un toast de exito. Las contrasenas van a Vault.';

revoke all on function public.guardar_alojamiento from public;
grant execute on function public.guardar_alojamiento to authenticated;


-- ----------------------------------------------------------------------------
-- Las credenciales de entrada
-- ----------------------------------------------------------------------------
-- Se piden aparte del resto del libro para que no queden en una respuesta que
-- se cachea, y con la misma regla que ya tiene la politica de `libro_huesped`:
-- el anfitrion siempre, el huesped **solo desde el dia de entrada**.
create or replace function public.credenciales_alojamiento(p_unidad_id uuid)
returns table (wifi_password text, puerta_password text)
language sql
stable
security definer
set search_path = public, pg_temp, vault
as $$
  select
    (select s.decrypted_secret from vault.decrypted_secrets s
      where s.id = l.wifi_password_secret),
    (select s.decrypted_secret from vault.decrypted_secrets s
      where s.id = l.puerta_password_secret)
  from public.libro_huesped l
  where l.unidad_id = p_unidad_id
    and (
      public.puede_operar_unidad(p_unidad_id)
      or public.es_huesped_alojado(p_unidad_id)
    );
$$;

comment on function public.credenciales_alojamiento(uuid) is
  'El wifi y la clave de la puerta, en claro. El huesped solo desde el dia de entrada: aqui esta donde queda la llave.';

revoke all on function public.credenciales_alojamiento(uuid) from public;
grant execute on function public.credenciales_alojamiento(uuid) to authenticated;
