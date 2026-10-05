-- ----------------------------------------------------------------------------
-- Un perfil que no se podia editar, por nada
-- ----------------------------------------------------------------------------
-- Salio escribiendo la prueba de «no se enciende WhatsApp sin telefono»: al
-- quitarle el telefono a Sofia, la base respondio
--
--     new row for relation "perfil" violates check constraint "codigo_pais_es_iso2"
--
-- Su fila tenia `codigo_pais = '+57'`, y ese `check` --`'^[A-Z]{2}$'`-- esta
-- creado **NOT VALID**. Eso significa dos cosas, y la segunda es la que muerde:
--
--   · las filas que ya estaban no se comprueban al crear la restriccion, que es
--     para lo que se usa `NOT VALID` y esta bien;
--   · pero **cualquier UPDATE posterior sobre esa fila si la comprueba**,
--     aunque no toque esa columna.
--
-- O sea que el perfil de Sofia no se podia modificar en absoluto: ni su nombre,
-- ni su telefono, ni su alias, ni una preferencia. Y el mensaje de error nombra
-- una columna que quien guarda no ha tocado, asi que se busca en el sitio
-- equivocado.
--
-- Sofia es la vecina de la 102 y la anfitriona del alojamiento de renta corta:
-- la cuenta que mas aparece en las pruebas y en las demostraciones.
--
-- ----------------------------------------------------------------------------
-- De donde salio el `+57`
-- ----------------------------------------------------------------------------
-- De antes de `CampoTelefono`. Ese componente guarda `pais.codigo` --el ISO2,
-- «CO»-- y lo hace bien; el `+57` es de cuando el prefijo y el codigo de pais
-- eran lo mismo para la pantalla. O sea que no hay nada que arreglar en el
-- codigo: hay un dato viejo que dejo la fila inservible.
--
-- Se traduce --`+57` es Colombia-- y no se borra.
--
-- ----------------------------------------------------------------------------
-- Y se valida, para que no vuelva a pasar en silencio
-- ----------------------------------------------------------------------------
-- Una restriccion `NOT VALID` que nadie valida nunca es una bomba con
-- temporizador: cada fila que la incumple es una fila que alguien no va a poder
-- editar, y no se entera hasta que lo intenta.
--
-- `validate constraint` recorre la tabla y falla si queda alguna. Que pase es
-- la prueba de que no queda ninguna, y de aqui en adelante la restriccion
-- rechaza el dato malo al escribirlo, que es donde se puede entender.
--
-- Aditiva: corrige un dato y valida dos restricciones. No borra nada.

update public.perfil
set codigo_pais = 'CO'
where codigo_pais in ('+57', '57');

-- Por si quedara alguno de otro pais escrito con prefijo: se deja en null
-- antes que perder la fila. Null es «no lo dijo», que es verdad.
update public.perfil
set codigo_pais = null
where codigo_pais is not null and codigo_pais !~ '^[A-Z]{2}$';

update public.perfil
set codigo_pais_alt = null
where codigo_pais_alt is not null and codigo_pais_alt !~ '^[A-Z]{2}$';

alter table public.perfil validate constraint codigo_pais_es_iso2;
alter table public.perfil validate constraint codigo_pais_alt_es_iso2;

comment on column public.perfil.codigo_pais is
  'ISO 3166-1 alfa-2 --«CO»--, no el prefijo telefonico. El prefijo se deduce de `PAISES` en el cliente. Hubo filas con `+57` de antes de `CampoTelefono`, y el `check` NOT VALID las dejaba inservibles: cualquier UPDATE sobre esa fila fallaba, aunque no tocara esta columna.';
