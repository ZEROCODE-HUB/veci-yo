-- El `check` de la noche espera a que el cliente decida
--
-- `20261010140000` lo añadió **NOT VALID** porque hay una fila de cero noches
-- creada por el cliente mientras probaba, y cambiar un dato suyo no es mío.
--
-- Eso estaba mal, y lo dijo `npm run restricciones` al instante: una `NOT
-- VALID` no comprueba las filas viejas, **pero sí comprueba cualquier UPDATE
-- posterior sobre una de ellas, aunque no toque esa columna**. O sea que esa
-- reserva del 17 al 17 habría quedado imposible de editar entera: ni cambiar
-- el número de personas, ni cerrar su preregistro, ni nada. Es exactamente lo
-- que ya pasó con el perfil de Sofía y su `+57`.
--
-- Así que se retira. El problema sigue cerrado por los dos sitios que
-- importan:
--
--   · el formulario no deja elegir una salida que no sea posterior a la
--     llegada;
--   · y el índice de solapes cuenta **al menos una noche**, así que la fila de
--     cero noches ocupa su día y nadie puede reservar encima.
--
-- ## Y se vuelve a poner, validada
--
-- El cliente la retiró en cuanto se lo dijimos —«eliminé mi reserva del 17»—
-- y de hecho **ya lo había intentado y le falló**: borrar es un `UPDATE`, y
-- la `NOT VALID` se lo estaba impidiendo. Su propio dato quedó atrapado por
-- la restricción que debía protegerlo, que es el aviso del guarda palabra por
-- palabra.
--
-- Sin filas malas, la regla se añade **validada**, que es la única forma en
-- que debe existir: que el `validate` pase es la prueba de que no queda
-- ninguna.

alter table public.visita
  drop constraint if exists visita_estancia_al_menos_una_noche;

alter table public.visita
  add constraint visita_estancia_al_menos_una_noche
  check (
    tipo <> 'huesped_temporal'
    /*
      Lo ya retirado no cuenta. Hay una estancia de cero noches del
      25/09/2026, borrada hace semanas, y una regla nueva no reescribe la
      historia: lo que importa es que no se puedan crear mas. Sin esta linea
      el `validate` no pasa y habria que tocar un dato viejo para estrenar
      una regla, que es al reves de como debe ser.
    */
    or deleted_at is not null
    or fecha_desde is null
    or fecha_hasta is null
    or fecha_hasta > fecha_desde
  );

comment on constraint visita_estancia_al_menos_una_noche on public.visita is
  'Alojarse es dormir ahi: la salida es posterior a la entrada. No mira lo '
  'ya retirado. Sin esto, '
  '`daterange(d, d, ''[)'')` sale vacio y una estancia de cero noches no '
  'chocaba con nada ni ocupaba ningun dia en el calendario.';
