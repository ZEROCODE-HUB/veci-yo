-- ----------------------------------------------------------------------------
-- Cada telefono con su pais
-- ----------------------------------------------------------------------------
-- Pedido por el cliente el 02/10/2026: «en el campo telefono poder escoger pais
-- (aplica en cualquier lugar que se deba llenar telefono)».
--
-- Hoy hay **once columnas de telefono** repartidas en nueve tablas, y una sola
-- --`perfil.codigo_pais`-- sabe de que pais es el numero. Las otras diez son un
-- texto suelto donde cada quien escribe lo que quiere: con prefijo, sin
-- prefijo, con espacios, con guiones.
--
-- Eso importa mas de lo que parece. El producto opera en **Colombia y Peru**, y
-- ademas el cliente quiere mandar avisos por WhatsApp, que exige el numero con
-- su prefijo internacional. Un «3001234567» sin pais no se puede marcar desde
-- fuera ni mandar a ninguna parte.
--
-- Decidido: **columna aparte**, no el numero ya compuesto. El dato queda
-- separado como lo esta en `perfil`, que es el unico que lo hacia bien.
--
-- Solo aditiva: ninguna columna se toca ni se borra.

alter table public.invitado
  add column if not exists codigo_pais text;
alter table public.condominio
  add column if not exists codigo_pais text;
alter table public.porteria
  add column if not exists codigo_pais text;
alter table public.membresia_condominio
  add column if not exists codigo_pais text;
alter table public.reclamo
  add column if not exists codigo_pais_contacto text;

/*
  `membresia_unidad` lleva **dos** telefonos --el suyo y el del contacto de
  emergencia-- asi que lleva dos paises. Es justo el caso donde una sola columna
  compartida habria obligado a suponer que los dos son del mismo sitio, y el
  contacto de emergencia de un huesped extranjero casi nunca lo es.
*/
alter table public.membresia_unidad
  add column if not exists codigo_pais text,
  add column if not exists codigo_pais_emergencia text;

alter table public.invitacion
  add column if not exists codigo_pais_emergencia text;

/*
  `perfil` ya lo tenia, pero sin forma: era texto libre donde cabia «+57», «57»
  o «Colombia». Se normaliza a ISO 3166-1 alfa-2 --«CO»-- que es lo que usa el
  resto del esquema (`condominio.pais`) y lo que permite buscar el prefijo en un
  catalogo en vez de guardarlo repetido en cada fila.
*/
alter table public.perfil
  add column if not exists codigo_pais_alt text;

comment on column public.perfil.codigo_pais is
  'ISO 3166-1 alfa-2 del telefono principal. Antes era texto libre; desde el 03/10/2026 se escribe normalizado.';
comment on column public.invitado.codigo_pais is
  'ISO 3166-1 alfa-2 del telefono. El huesped lo elige en su preregistro.';


-- ----------------------------------------------------------------------------
-- Que lo que se guarde sea un pais
-- ----------------------------------------------------------------------------
-- Dos letras o nada. Sin esto la columna acepta «+57», «57» y «Colombia», que
-- es exactamente de donde venimos: un dato que cada pantalla interpreta a su
-- manera y que nadie puede usar para marcar un numero.
--
-- `check` y no enum: la lista de paises cambia, y una migracion por cada pais
-- nuevo no tiene sentido. El catalogo con los prefijos vive en la aplicacion.

do $$
declare
  t record;
begin
  for t in
    select unnest(array[
      'invitado.codigo_pais',
      'condominio.codigo_pais',
      'porteria.codigo_pais',
      'membresia_condominio.codigo_pais',
      'membresia_unidad.codigo_pais',
      'membresia_unidad.codigo_pais_emergencia',
      'invitacion.codigo_pais_emergencia',
      'reclamo.codigo_pais_contacto',
      'perfil.codigo_pais',
      'perfil.codigo_pais_alt'
    ]) as ruta
  loop
    execute format(
      'alter table public.%I drop constraint if exists %I',
      split_part(t.ruta, '.', 1),
      split_part(t.ruta, '.', 2) || '_es_iso2'
    );
    execute format(
      'alter table public.%I add constraint %I check (%I is null or %I ~ ''^[A-Z]{2}$'') not valid',
      split_part(t.ruta, '.', 1),
      split_part(t.ruta, '.', 2) || '_es_iso2',
      split_part(t.ruta, '.', 2),
      split_part(t.ruta, '.', 2)
    );
  end loop;
end $$;

/*
  `not valid` a proposito: `perfil.codigo_pais` ya tiene filas escritas con el
  formato viejo, y validarlas de golpe tumbaria la migracion. La restriccion
  rige para todo lo que se escriba de ahora en adelante, que es lo que se
  quiere; lo viejo se corrige cuando alguien abra su perfil.

  No se normalizan a ciegas las que hay: «57» podria ser Colombia, pero
  adivinarlo y escribirlo seria inventarse un dato de alguien.
*/
