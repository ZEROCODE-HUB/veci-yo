-- ---------------------------------------------------------------------------
-- Las habitaciones las pone el anfitrion
-- ---------------------------------------------------------------------------
-- La pantalla de renta corta tiene un campo «Habitaciones» que se puede
-- escribir y que no guardaba nada. Se escribia un 3, salia «Configuracion
-- guardada» en verde, y al volver ponia otra vez lo de antes.
--
-- No es un descuido de la pantalla: `config_renta_corta` tenia la columna
-- `num_habitaciones` y esa tabla se elimino en 20260923140000 al consolidar
-- todo en `suscripcion_renta_corta`, que nacio sin ella. El campo del
-- formulario sobrevivio a la columna. Mientras tanto `ficha_alojamiento`
-- tapaba el hueco leyendo `tipologia.habitaciones`, que es lo que el edificio
-- declara del plano --no lo que el anfitrion ofrece--: dos viviendas con la
-- misma tipologia no pueden diferir, y una habitacion cerrada al huesped no
-- se puede descontar.
--
-- Vuelve la columna. La tipologia queda de respaldo para las viviendas que
-- nunca la rellenen, que es lo que la ficha hacia hasta hoy.
alter table public.suscripcion_renta_corta
  add column if not exists num_habitaciones integer;

comment on column public.suscripcion_renta_corta.num_habitaciones is
  'Habitaciones que ofrece el anfitrion. Vacia manda tipologia.habitaciones, que es lo que declara el edificio.';

-- Nadie pierde lo que veia: lo que hoy muestra la ficha queda escrito.
update public.suscripcion_renta_corta s
   set num_habitaciones = t.habitaciones
  from public.unidad u
  join public.tipologia t on t.id = u.tipologia_id
 where u.id = s.unidad_id
   and s.num_habitaciones is null
   and t.habitaciones is not null;


-- ---------------------------------------------------------------------------
-- La ficha prefiere lo que dijo el anfitrion
-- ---------------------------------------------------------------------------
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
as $ficha$
  select
    coalesce(s.descripcion, ''),
    coalesce(s.num_habitaciones, t.habitaciones, 0),
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
$ficha$;


-- ---------------------------------------------------------------------------
-- Guardar el alojamiento, con las habitaciones dentro
-- ---------------------------------------------------------------------------
-- Se borra por nombre y no por firma: anadir un parametro a `create or
-- replace` no reemplaza nada, deja dos funciones hermanas y PostgREST se
-- queda sin saber a cual llamar.
do $limpia$
declare
  f record;
begin
  for f in
    select oid::regprocedure as firma
      from pg_proc
     where proname = 'guardar_alojamiento'
       and pronamespace = 'public'::regnamespace
  loop
    execute format('drop function %s', f.firma);
  end loop;
end
$limpia$;

create function public.guardar_alojamiento(
  p_unidad_id              uuid,
  p_descripcion            text    default null,
  p_num_habitaciones       integer default null,
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
as $guardar$
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
    num_habitaciones         = coalesce(p_num_habitaciones, num_habitaciones),
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
  -- porque las contrasenas no se releen, no porque se quieran quitar.
  if coalesce(p_wifi_password, '') <> '' then
    if v_libro.wifi_password_secret is null then
      v_wifi_id := vault.create_secret(
        p_wifi_password,
        'wifi_' || p_unidad_id::text,
        'Clave del wifi del alojamiento');
    else
      v_wifi_id := v_libro.wifi_password_secret;
      perform vault.update_secret(v_wifi_id, p_wifi_password);
    end if;
  else
    v_wifi_id := v_libro.wifi_password_secret;
  end if;

  if coalesce(p_puerta_password, '') <> '' then
    if v_libro.puerta_password_secret is null then
      v_puerta_id := vault.create_secret(
        p_puerta_password,
        'puerta_' || p_unidad_id::text,
        'Clave de la puerta del alojamiento');
    else
      v_puerta_id := v_libro.puerta_password_secret;
      perform vault.update_secret(v_puerta_id, p_puerta_password);
    end if;
  else
    v_puerta_id := v_libro.puerta_password_secret;
  end if;

  update public.libro_huesped set
    wifi_nombre            = coalesce(p_wifi_nombre, wifi_nombre),
    wifi_password_secret   = v_wifi_id,
    puerta_password_secret = v_puerta_id,
    instrucciones          = coalesce(p_instrucciones, instrucciones),
    notas                  = coalesce(p_notas, notas)
  where id = v_libro.id;
end
$guardar$;

revoke all on function public.guardar_alojamiento from public;
grant execute on function public.guardar_alojamiento to authenticated;
