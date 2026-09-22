-- ============================================================================
-- 0010 · El anuncio del guardia
-- ============================================================================
-- El prototipo guardaba esto como `instruccionesCumplidas: Record<string,
-- boolean>`, un mapa abierto que en la practica tiene UNA sola clave:
-- `llamoAnuncie`. No es una coleccion: es un hecho puntual del guardia sobre
-- una visita, y como todo hecho de este dominio necesita quien y cuando
-- (regla 2 de AGENTS.md).
--
-- Cuando la instruccion es `notificar_y_anunciar`, el guardia debe llamar al
-- residente antes de dejar pasar. Que quede registrado quien anuncio y a que
-- hora es justamente lo que da valor al modulo de porteria.
-- ============================================================================

alter table public.visita
  add column anunciada_en   timestamptz,
  add column anunciada_por  uuid references auth.users(id) on delete set null;

create index visita_anunciada_por_idx on public.visita (anunciada_por);

alter table public.visita
  add constraint visita_anuncio_con_actor
  check (anunciada_en is null or anunciada_por is not null);

comment on column public.visita.anunciada_en is
  'Momento en que el guardia llamo al residente y anuncio la visita. Null = todavia no se anuncio.';
