-- ----------------------------------------------------------------------------
-- El umbral de noches decide de verdad
-- ----------------------------------------------------------------------------
-- El 25/09/2026 el cliente lo pidio con estas palabras:
--
--   "Parametro estancia corta, estancia larga. Menos de 1 mes mas limitantes.
--    Mas, ya son casi residentes."
--
-- Se construyo entero: la columna `corta_hasta_noches`, su campo en la pantalla
-- de permisos, `es_estancia_corta(unidad, noches)` y `estancia_admite_visitas`.
-- Y **nadie llamaba a ninguna de las dos**, asi que el numero no decidia nada.
--
-- Lo que decidia era `reglas_de_estancia`, con otro criterio distinto: la
-- vivienda esta "en estancia corta" si **hoy hay alguien alojado**, sin mirar
-- cuantas noches. Dos definiciones de lo mismo en la misma base, y corriendo la
-- que el cliente no pidio.
--
-- La consecuencia practica es justo la que queria evitar: **a un huesped de
-- tres meses se le aplicaban las reglas de estancia corta**, las mas
-- limitantes, cuando por su propia regla "ya son casi residentes".
--
-- Encontrado el 01/10/2026 barriendo por familias (REVISAR-A-OJO 91).
--
-- Lo que cambia: `reglas_de_estancia` deja de preguntar "hay alguien hoy" y
-- pasa a preguntar "cuantas noches dura la estancia que hay hoy", que es lo
-- mismo que ya mide `es_estancia_corta`. Un solo criterio, un solo sitio.

create or replace function public.reglas_de_estancia(p_unidad_id uuid)
returns table (
  permite_visitas  boolean,
  permite_ninos    boolean,
  permite_mascotas boolean,
  permite_cocheras boolean,
  estancia_minima  integer,
  estancia_maxima  integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  with p as (select * from public.permisos_de_unidad(p_unidad_id)),
  /*
    La estancia que hay hoy en esa vivienda, y **cuanto dura**.

    Antes aqui solo se preguntaba si existia (`exists`). Ahora se traen las
    fechas, porque la duracion es lo que decide que juego de reglas toca.

    Si hay varias --no deberia, pero el dato no lo impide-- manda la mas larga:
    si alguien se queda tres meses, la vivienda no esta en regimen de estancia
    corta aunque tambien haya alguien de dos noches.
  */
  estancia as (
    select max(
      case
        -- Sin fecha de salida la estancia es indefinida: eso no es corta.
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
    case when u.corto then p.corta_estancia_maxima  else p.larga_estancia_maxima  end
  from p
  cross join estancia e
  cross join lateral (
    select
      case
        -- Sin diferenciacion manda el juego corto, que es el unico que la
        -- pantalla edita. Esto no cambia.
        when not coalesce(p.diferencia_estancia, false) then true
        -- Sin nadie alojado no hay estancia que clasificar: rigen las reglas
        -- de residente, que es lo que hay en la vivienda el resto del tiempo.
        when e.noches is null then false
        -- Y con alguien dentro, lo que manda es cuanto se queda.
        else public.es_estancia_corta(p_unidad_id, e.noches)
      end as corto
  ) u;
$fn$;

comment on function public.reglas_de_estancia(uuid) is
  'El juego de reglas que aplica a una vivienda ahora mismo. Sin diferenciacion manda el juego corto. Con ella, decide la DURACION de la estancia que haya hoy contra corta_hasta_noches, que es la regla que pidio el cliente el 25/09/2026.';
