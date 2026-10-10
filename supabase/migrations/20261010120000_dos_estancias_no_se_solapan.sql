-- Dos estancias no se solapan en la misma vivienda
--
-- El cliente creó una reserva encima de otra, en las mismas fechas y el mismo
-- piso, y la base la aceptó: «sí me deja marcarlas, wtf? ¿no deberían aparecer
-- tipo bloqueadas o algo así?» (09/10/2026).
--
-- No había **nada** que lo impidiera: ni restricción, ni disparador, ni una
-- comprobación en la pantalla. Y es una reserva doble del mismo apartamento,
-- que se descubre el día del check-in con dos huéspedes en la puerta.
--
-- No está decidido en el KT —lo busqué— así que la regla es nueva, y queda
-- dicha aquí: **una vivienda no se alquila dos veces a la vez.**
--
-- ## El rango es medio abierto, y eso es lo importante
--
-- `[fecha_desde, fecha_hasta)`: quien sale el 17 y quien entra el 17 **no se
-- pisan**. Es el caso normal de una renta corta —uno se va por la mañana, el
-- otro llega por la tarde— y con un rango cerrado quedaría prohibido, que
-- sería peor que el problema que esto arregla.
--
-- ## Lo que no bloquea
--
--   · Las canceladas y las borradas: una reserva que se cayó no ocupa nada.
--   · Lo que no es una estancia de huésped. Una visita de un amigo o un
--     profesional no reserva la vivienda, así que puede coincidir con
--     cualquier cosa.
--
-- Aditiva: una extensión y una restricción. Comprobado antes de escribir esto
-- que **no hay ni un solapamiento** en la base, así que no rechaza nada de lo
-- que ya existe.

create extension if not exists btree_gist with schema extensions;

alter table public.visita
  drop constraint if exists visita_sin_estancias_solapadas;

/*
  `exclude using gist` y no un disparador: lo resuelve el indice, asi que es
  correcto **tambien bajo concurrencia**. Dos reservas de la misma vivienda
  mandadas a la vez son exactamente el caso que un disparador con un `select`
  previo deja pasar, y es ademas el caso realista: el calendario de Airbnb
  sincronizando mientras el anfitrion reserva a mano.
*/
alter table public.visita
  add constraint visita_sin_estancias_solapadas
  exclude using gist (
    unidad_id with =,
    daterange(fecha_desde, fecha_hasta, '[)') with &&
  )
  where (
    tipo = 'huesped_temporal'
    and deleted_at is null
    and estado <> 'cancelada'
    and unidad_id is not null
    and fecha_desde is not null
    and fecha_hasta is not null
  );

comment on constraint visita_sin_estancias_solapadas on public.visita is
  'Una vivienda no se alquila dos veces a la vez. El rango es medio abierto, '
  'asi que quien sale el 17 y quien entra el 17 no se pisan. No cuentan las '
  'canceladas, las borradas, ni lo que no sea una estancia de huesped.';
