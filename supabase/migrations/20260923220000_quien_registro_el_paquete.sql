-- ----------------------------------------------------------------------------
-- Quien registro y quien recibio el paquete
-- ----------------------------------------------------------------------------
-- El modulo de correspondencia **nunca ha funcionado**. Su consulta pide el
-- nombre de quien registro y de quien recibio cada envio asi:
--
--   registrada_por:perfil!correspondencia_registrada_por_fkey ( nombre, apellido ),
--   recibida_por:perfil!correspondencia_recibida_por_fkey ( nombre, apellido ),
--
-- Y esas dos claves foraneas apuntan a `auth.users`, no a `public.perfil`. Asi
-- que PostgREST responde 400:
--
--   "Searched for a foreign key relationship between 'correspondencia' and
--    'perfil' using the hint 'correspondencia_registrada_por_fkey', but no
--    matches were found."
--
-- La pantalla no mira `query.error`: pinta la lista con `data ?? []`, o sea
-- **vacia**, exactamente igual que si no hubiera ningun paquete. Por eso nadie
-- lo noto: no hay error a la vista, hay una bandeja vacia.
--
-- La identidad es `auth.users.id` y `perfil.id` es esa misma columna (regla 3),
-- asi que la relacion existe; lo que faltaba era declararla para que PostgREST
-- la vea. Se añaden las dos claves contra `perfil`, con el nombre que la
-- consulta ya usa.
--
-- `on delete set null` igual que las de `auth.users`: si alguien se da de baja,
-- el paquete no desaparece —es un hecho del edificio— pero deja de tener actor.

alter table public.correspondencia
  drop constraint if exists correspondencia_registrada_por_perfil_fkey;
alter table public.correspondencia
  add constraint correspondencia_registrada_por_perfil_fkey
  foreign key (registrada_por) references public.perfil(id) on delete set null;

alter table public.correspondencia
  drop constraint if exists correspondencia_recibida_por_perfil_fkey;
alter table public.correspondencia
  add constraint correspondencia_recibida_por_perfil_fkey
  foreign key (recibida_por) references public.perfil(id) on delete set null;

comment on constraint correspondencia_registrada_por_perfil_fkey on public.correspondencia is
  'Declara la relacion con perfil para poder pedir el nombre en una sola consulta. La identidad sigue siendo auth.users.id.';
