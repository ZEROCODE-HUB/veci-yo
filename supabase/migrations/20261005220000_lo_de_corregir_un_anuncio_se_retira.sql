-- ----------------------------------------------------------------------------
-- Lo de corregir un anuncio se retira
-- ----------------------------------------------------------------------------
-- Se construyo y se retira el mismo dia. Al preguntarle al cliente que pasaba
-- si se corrige un anuncio ya publicado, eligio «avisar del cambio solo si se
-- pide» --una pregunta razonable-- y al enseñarle que **corregir no existia**
-- lo zanjo: «pero si no habia lo de corregir anuncio, pues no lo pongas».
--
-- Tiene razon. No era lo que habia pedido, y lo que pidio --que publicar
-- avise-- no lo necesita. Construir de mas porque una respuesta lo daba por
-- hecho es ensanchar el encargo por mi cuenta.
--
-- Lo que se queda: el aviso al publicar, la casilla de avisar, y que la fecha
-- de publicacion programe. Lo que se va: `corregir_publicacion`, y la variante
-- de dos argumentos de `avisar_de_la_publicacion`, que solo existia para el
-- texto del aviso de un cambio.
--
-- Y la politica `publicacion_cambio` **se queda como estaba**: existe desde el
-- primer dia, no la escribi yo, y la usa `publicar_resultados`. Lo que se
-- retira es lo que yo añadi.
--
-- Una funcion que no llama nadie es la misma clase de cosa que una columna que
-- nadie escribe: el siguiente que la lea va a creer que la pantalla existe.
-- Por eso se borra en vez de dejarla «por si acaso».

drop function if exists public.corregir_publicacion(
  uuid, text, text, text, timestamptz, timestamptz,
  boolean, boolean, boolean, boolean);

-- `create or replace` con otro numero de argumentos crea una **nueva**: la de
-- dos se queda viva si no se borra a mano.
drop function if exists public.avisar_de_la_publicacion(uuid, boolean);
