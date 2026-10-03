-- ----------------------------------------------------------------------------
-- El horario de entrada necesitaba columnas donde vivir
-- ----------------------------------------------------------------------------
-- `checkin_desde`, `checkin_hasta` y `checkin_24h` **no estaban** en
-- `suscripcion_renta_corta`. Estaban en `config_renta_corta`, que se borro el
-- 23/09/2026 cuando las dos tablas se fusionaron en una, y en la mudanza se
-- quedaron fuera.
--
-- Lo que lo hizo invisible: `guardar_alojamiento` se creo en la migracion
-- anterior con un `update ... set checkin_desde = ...` sobre una columna que no
-- existe, **y se aplico sin error**. plpgsql no comprueba el cuerpo de una
-- funcion al crearla: lo comprueba la primera vez que alguien la llama. Asi que
-- la funcion quedo rota y la migracion dijo que todo bien.
--
-- Es la misma leccion que ya esta escrita en AGENTS.md por `permisos_de_unidad`
-- --«una columna nueva puede romper una funcion sin tocarla»-- por el otro lado:
-- aqui lo que faltaba era la columna, no la funcion.
--
-- Mientras tanto hay tres sitios leyendo este dato: el huesped lo ve en
-- «Mi alojamiento» (`AlojamientoInfoChips`), el edificio lo limita
-- (`permisos_de_unidad` devuelve `corta_checkin_desde` y `corta_checkin_hasta`)
-- y ahora el anfitrion lo escribe. Los tres apuntaban a una columna fantasma.
--
-- Solo aditiva.

alter table public.suscripcion_renta_corta
  add column if not exists checkin_desde time,
  add column if not exists checkin_hasta time,
  add column if not exists checkin_24h   boolean not null default false;

comment on column public.suscripcion_renta_corta.checkin_desde is
  'Desde que hora puede entrar un huesped a esta vivienda. Lo fija el anfitrion, dentro de lo que permita el edificio.';
comment on column public.suscripcion_renta_corta.checkin_hasta is
  'Hasta que hora. Null con checkin_24h en false significa que el anfitrion no lo ha dicho.';
comment on column public.suscripcion_renta_corta.checkin_24h is
  'Se puede entrar a cualquier hora. Gana sobre las dos anteriores.';

/*
  Una franja que termina antes de empezar no existe. Se comprueba aqui porque la
  pantalla puede equivocarse y la base es el limite, no el formulario.

  `checkin_24h` la desactiva: si se entra a cualquier hora, las dos horas no
  significan nada y da igual como esten.
*/
alter table public.suscripcion_renta_corta
  drop constraint if exists suscripcion_checkin_coherente;
alter table public.suscripcion_renta_corta
  add constraint suscripcion_checkin_coherente
  check (
    checkin_24h
    or checkin_desde is null
    or checkin_hasta is null
    or checkin_hasta > checkin_desde
  );
