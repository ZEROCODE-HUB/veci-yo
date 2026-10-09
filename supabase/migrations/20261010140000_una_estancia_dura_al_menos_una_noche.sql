-- Una estancia dura al menos una noche
--
-- El cliente reservó del 17 al 17 y la restricción de solapes la dejó pasar:
-- «sigue me deja seleccionar esa fecha xD».
--
-- Tenía razón y el motivo es sutil. `daterange('2026-10-17','2026-10-17','[)')`
-- es un **rango vacío**, y en Postgres un rango vacío no se solapa con nada.
-- Así que una estancia de cero noches:
--
--   · no choca con ninguna otra, ni siquiera con otra idéntica;
--   · no ocupa ningún día, así que el calendario no tacha nada;
--   · y aun así existe, con su enlace, su preregistro y su reporte al
--     ministerio declarando un alojamiento que no fue.
--
-- Son dos arreglos y los dos hacen falta:
--
--   1. **Una estancia de cero noches no debería existir.** Alojarse es dormir
--      ahí; el modelo entero lo da por hecho --la membresía del huésped caduca
--      en `fecha_hasta + 1`, las credenciales se abren el día de llegada--.
--      Eso va en la pantalla y en un `check`.
--   2. Y mientras tanto, **que una estancia ocupe su día aunque midiera
--      cero**: el rango del índice toma al menos una noche. Sin esto, las
--      filas que ya existen seguirían sin bloquear nada.
--
-- El `check` se añade **NOT VALID a propósito y se dice por qué**: hay una
-- fila de cero noches creada hoy por el cliente mientras probaba, y borrar o
-- cambiar un dato suyo no es mío. Queda anotado en `REVISAR-A-OJO.md` y se
-- valida en cuanto él decida qué hacer con ella. El índice de abajo sí la
-- cubre desde ya, que es lo que importaba.

-- ============================================================================
-- 1. El solape cuenta al menos una noche
-- ============================================================================

alter table public.visita
  drop constraint if exists visita_sin_estancias_solapadas;

alter table public.visita
  add constraint visita_sin_estancias_solapadas
  exclude using gist (
    unidad_id with =,
    /*
      `greatest(fecha_hasta, fecha_desde + 1)`: una estancia ocupa su dia
      aunque este guardada con la misma fecha de entrada y de salida. Sin
      esto el rango sale vacio y **no colisiona con nada**, que es justo lo
      que dejo meter dos reservas el mismo dia.

      Es inmutable --aritmetica de fechas-- asi que vale dentro de un indice.
    */
    daterange(
      fecha_desde,
      greatest(fecha_hasta, fecha_desde + 1),
      '[)'
    ) with &&
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
  'asi que quien sale el 17 y quien entra el 17 no se pisan; y cuenta al '
  'menos una noche, porque un rango vacio no colisionaria con nada. No '
  'cuentan las canceladas, las borradas, ni lo que no sea estancia.';

-- ============================================================================
-- 2. Y que no se puedan crear de cero noches
-- ============================================================================

alter table public.visita
  drop constraint if exists visita_estancia_al_menos_una_noche;

alter table public.visita
  add constraint visita_estancia_al_menos_una_noche
  check (
    tipo <> 'huesped_temporal'
    or fecha_desde is null
    or fecha_hasta is null
    or fecha_hasta > fecha_desde
  )
  not valid;

comment on constraint visita_estancia_al_menos_una_noche on public.visita is
  'Alojarse es dormir ahi: la salida es posterior a la entrada. **NOT VALID a '
  'proposito**: el 09/10/2026 quedo una fila de cero noches creada por el '
  'cliente mientras probaba, y decidir que hacer con un dato suyo no es del '
  'programador. Se valida en cuanto lo diga; mientras tanto, el indice de '
  'arriba ya hace que esa fila ocupe su dia.';
