-- ----------------------------------------------------------------------------
-- El horario de check-in deja de ser un campo mudo
-- ----------------------------------------------------------------------------
-- La administracion elige un horario de check-in para la estancia corta y otro
-- para la larga --«08:30 a 13:30», «14:00 a 20:00», «24 horas»--, se guarda en
-- cuatro columnas, y ahi se quedaba: ningun disparador lo imponia, ninguna
-- pantalla lo enseñaba, y la ficha que lee el huesped solo sacaba de esas
-- reglas las mascotas y los niños.
--
-- Encontrado el 01/10/2026 barriendo por familias (REVISAR-A-OJO 90).
--
-- El campo venia del prototipo, donde los permisos de vivienda eran «UI y
-- estado local» --lo dice el propio KT--, asi que alli tampoco hacia nada. No
-- se perdio un comportamiento: nunca existio, y nadie escribio que deberia
-- provocar.
--
-- Decidido con el cliente el 01/10/2026: **se enseña al huesped**. Y aparte, la
-- porteria recibe un aviso al marcar una entrada fuera de esa franja --aviso y
-- no bloqueo, que es el criterio que el cliente ya fijo para el aforo: «mostrar
-- como advertencia, no bloqueo duro»--. Eso ultimo vive en la aplicacion,
-- porque un horario no es un limite de seguridad: es informacion.
--
-- Aqui solo viaja el dato. Las dos funciones devuelven dos columnas mas, y eso
-- obliga a `drop` + `create`: una funcion que devuelve `table(...)` no se puede
-- reemplazar cambiandole las columnas. Nada se pierde; quien las llama pide sus
-- campos por nombre.

drop function if exists public.ficha_alojamiento(uuid);
drop function if exists public.reglas_de_estancia(uuid);

-- ----------------------------------------------------------------------------
-- Las reglas que rigen hoy, ahora tambien con el horario
-- ----------------------------------------------------------------------------
-- Identica a la del 01/10/2026 --que hizo que mandara la duracion de la
-- estancia y no «si hay alguien hoy»-- con `checkin_desde` y `checkin_hasta`
-- añadidos al mismo `case`, que es lo que mantiene un solo criterio.
create or replace function public.reglas_de_estancia(p_unidad_id uuid)
returns table (
  permite_visitas  boolean,
  permite_ninos    boolean,
  permite_mascotas boolean,
  permite_cocheras boolean,
  estancia_minima  integer,
  estancia_maxima  integer,
  checkin_desde    time,
  checkin_hasta    time
)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  with p as (select * from public.permisos_de_unidad(p_unidad_id)),
  /*
    La estancia que hay hoy en esa vivienda, y cuanto dura. Si hay varias manda
    la mas larga: si alguien se queda tres meses, la vivienda no esta en
    regimen de estancia corta aunque ademas haya alguien de dos noches.
  */
  estancia as (
    select max(
      case
        when m.vigente_hasta is null then 1000000
        else greatest(m.vigente_hasta - coalesce(m.vigente_desde, current_date), 1)
      end
    ) as noches
    from public.membresia_unidad m
    where m.unidad_id = p_unidad_id
      and m.rol = 'huesped_temporal'
      and m.activo
      and (m.vigente_desde is null or m.vigente_desde <= current_date)
      and (m.vigente_hasta is null or m.vigente_hasta >= current_date)
  )
  select
    case when u.corto then p.corta_permite_visitas  else p.larga_permite_visitas  end,
    case when u.corto then p.corta_permite_ninos    else p.larga_permite_ninos    end,
    case when u.corto then p.corta_permite_mascotas else p.larga_permite_mascotas end,
    case when u.corto then p.corta_permite_cocheras else p.larga_permite_cocheras end,
    case when u.corto then p.corta_estancia_minima  else p.larga_estancia_minima  end,
    case when u.corto then p.corta_estancia_maxima  else p.larga_estancia_maxima  end,
    case when u.corto then p.corta_checkin_desde    else p.larga_checkin_desde    end,
    case when u.corto then p.corta_checkin_hasta    else p.larga_checkin_hasta    end
  from p
  cross join estancia e
  cross join lateral (
    select
      case
        when not coalesce(p.diferencia_estancia, false) then true
        when e.noches is null then false
        else public.es_estancia_corta(p_unidad_id, e.noches)
      end as corto
  ) u;
$fn$;

comment on function public.reglas_de_estancia(uuid) is
  'El juego de reglas que aplica a una vivienda ahora mismo, horario de check-in incluido. Sin diferenciacion manda el juego corto. Con ella, decide la DURACION de la estancia que haya hoy contra corta_hasta_noches.';

-- ----------------------------------------------------------------------------
-- Y la ficha que lee el huesped
-- ----------------------------------------------------------------------------
create or replace function public.ficha_alojamiento(p_unidad_id uuid)
returns table (
  descripcion      text,
  num_habitaciones integer,
  max_huespedes    integer,
  estacionamientos integer,
  permite_mascotas boolean,
  apto_ninos       boolean,
  checkin_desde    time,
  checkin_hasta    time
)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select
    coalesce(s.descripcion, ''),
    coalesce(s.num_habitaciones, t.habitaciones, 0),
    coalesce(s.max_huespedes, 0),
    s.estacionamientos_huesped,
    coalesce(s.permite_mascotas, true) and coalesce(r.permite_mascotas, true),
    coalesce(s.apto_ninos, true)       and coalesce(r.permite_ninos, true),
    -- El horario sale tal cual de las reglas: sin decidir es nulo, y entonces
    -- la pantalla no promete una franja que nadie puso.
    r.checkin_desde,
    r.checkin_hasta
  from public.unidad u
  join public.suscripcion_renta_corta s on s.unidad_id = u.id
  left join public.tipologia t on t.id = u.tipologia_id
  cross join lateral public.reglas_de_estancia(u.id) r
  where u.id = p_unidad_id
    and (
      public.puede_operar_unidad(p_unidad_id)
      or public.es_huesped_con_reserva(p_unidad_id)
    );
$fn$;

comment on function public.ficha_alojamiento(uuid) is
  'La ficha que ve quien se aloja: descripcion, habitaciones, aforo, estacionamientos, mascotas, niños y el horario de check-in que rige. No abre la suscripcion entera: el estado comercial del anfitrion no es asunto del huesped.';

revoke all on function public.reglas_de_estancia(uuid) from public;
revoke all on function public.ficha_alojamiento(uuid) from public;
grant execute on function public.reglas_de_estancia(uuid) to authenticated;
grant execute on function public.ficha_alojamiento(uuid) to authenticated;
