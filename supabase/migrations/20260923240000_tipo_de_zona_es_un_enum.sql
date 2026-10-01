-- ----------------------------------------------------------------------------
-- El tipo de una zona comun es un enum, y esta en español
-- ----------------------------------------------------------------------------
-- `zona_comun.tipo` es `text` libre. La base guarda "Recreacion", "Servicios"
-- y "Eventos", y el desplegable del formulario ofrece esto:
--
--   ["Barbecue", "Swimming Pool", "Children's Park", "Gym", "Coworking Space",
--    "Tennis Court", "Game Room", "Laundry Room"]
--
-- En ingles, y confundiendo dos cosas distintas: eso no son *tipos* de zona,
-- son zonas. Es una lista heredada del prototipo.
--
-- Consecuencia concreta, vista al abrir la piscina para editarla: el
-- desplegable decia "Selecciona un tipo" **con la zona ya clasificada como
-- Recreacion**, porque el valor guardado no esta en la lista. Y crear una zona
-- nueva guardaba "Barbecue" como tipo, en una aplicacion que el KT decide en
-- español (8.4, `[DECIDIDO]`).
--
-- La regla 4 de `AGENTS.md` lo dice desde el primer dia: "Todo campo estado,
-- tipo, rol o categoria es un enum de Postgres. Si un valor todavia no esta
-- decidido por producto, se documenta como pendiente; no se deja un `text`
-- abierto por ahora."
--
-- Los valores son los tres que hay en los datos. No se inventan mas: añadir
-- categorias es una decision de producto, y esa lista es justo la que estaba
-- inventada.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_zona') then
    create type public.tipo_zona as enum ('recreacion', 'servicios', 'eventos');
  end if;
end
$$;

-- Los valores actuales vienen con mayuscula inicial y sin tilde.
update public.zona_comun
   set tipo = lower(translate(tipo, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'))
 where tipo is not null;

-- Lo que no encaje se marca como servicios en vez de romper la migracion. Hoy
-- no hay ninguno; si mañana lo hay, una zona mal clasificada se corrige desde
-- la pantalla y una migracion a medias no.
update public.zona_comun
   set tipo = 'servicios'
 where tipo is not null
   and tipo not in ('recreacion', 'servicios', 'eventos');

alter table public.zona_comun
  alter column tipo type public.tipo_zona
  using nullif(btrim(tipo), '')::public.tipo_zona;

comment on column public.zona_comun.tipo is
  'Categoria de la zona. Era `text` libre y el formulario ofrecia una lista en ingles heredada del prototipo.';
