-- ----------------------------------------------------------------------------
-- Un paquete registrado por la porteria esta en la porteria
-- ----------------------------------------------------------------------------
-- Salio al registrar un paquete como guardia en Chrome. La pantalla mandaba:
--
--   estado: informarItem ? "En Portería" : "No Recibido"
--
-- `informarItem` es el modo "reportar una incidencia". O sea: registrar un
-- paquete normal --el caso corriente, el guardia con la caja en la mano-- lo
-- dejaba como **no recibido**, y solo reportando una incidencia quedaba en
-- porteria. Esta al reves.
--
-- El KT, flujo 4.5: "Seguridad registra la llegada de un paquete". Si lo
-- registra es porque llego y lo tiene. "No recibido" describe otra cosa: algo
-- anunciado que todavia no esta.
--
-- Eso se corrige en la pantalla. Lo que se corrige aqui es el enum.
--
-- ----------------------------------------------------------------------------
-- El enum de estado tenia dentro tres categorias
-- ----------------------------------------------------------------------------
--   estado_correspondencia: no_recibido, delivery, en_porteria, sobres,
--                           entregado, paqueteria
--
-- `delivery`, `sobres` y `paqueteria` **no son estados de un paquete**: son
-- categorias, y existen ya en su propio enum `categoria_correspondencia`.
-- Estan aqui por herencia del prototipo, donde un mismo campo servia para las
-- dos cosas.
--
-- Ninguna fila los usa --se comprobo: cero--, pero mientras esten permitidos
-- se puede escribir `estado = 'sobres'`, que no significa nada, y ninguna
-- restriccion lo impide. Es justo lo que la regla 4 quiere evitar.
--
-- Quitar valores de un enum obliga a recrearlo.

alter table public.correspondencia
  alter column estado drop default;

-- La restriccion compara contra el tipo viejo, asi que hay que retirarla antes
-- de cambiarlo y volver a ponerla despues. Lo que dice no cambia: un paquete
-- entregado tiene que decir cuando.
alter table public.correspondencia
  drop constraint if exists correspondencia_entregada_con_fecha;

create type public.estado_correspondencia_nuevo as enum (
  'no_recibido',
  'en_porteria',
  'entregado'
);

alter table public.correspondencia
  alter column estado type public.estado_correspondencia_nuevo
  using estado::text::public.estado_correspondencia_nuevo;

drop type public.estado_correspondencia;
alter type public.estado_correspondencia_nuevo
  rename to estado_correspondencia;

alter table public.correspondencia
  alter column estado set default 'en_porteria'::public.estado_correspondencia;

comment on column public.correspondencia.estado is
  'Donde esta el paquete: anunciado y sin llegar, en la porteria, o entregado. El enum llevaba dentro tres categorias --delivery, sobres, paqueteria-- que no son estados y ya viven en `categoria_correspondencia`.';

-- Y el valor por defecto dice lo mismo que la pantalla corregida: si alguien
-- registra un paquete sin decir donde esta, esta en la porteria, porque es la
-- porteria quien lo registra.

alter table public.correspondencia
  add constraint correspondencia_entregada_con_fecha
  check (estado <> 'entregado'::public.estado_correspondencia
         or entregada_en is not null);
