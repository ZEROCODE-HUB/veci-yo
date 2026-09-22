-- ============================================================================
-- 0013 · Correcciones de correspondencia
-- ============================================================================
-- Dos cosas que solo aparecieron al conectar la pantalla:
--
-- 1. `categoria_correspondencia` quedo con los valores equivocados. El
--    inventario automatico de literales encontro `Delivery / Compra /
--    Servicios`, pero esos venian del campo `categoria` de OTRA entidad: las
--    opciones reales del selector de correspondencia son
--    `Delivery / Sobres / Paqueteria` (constante CATEGORIAS).
--    La tabla esta vacia, asi que se rehace el tipo en vez de arrastrar valores
--    que nadie va a usar.
--
-- 2. Faltaba el destinatario. La pantalla registra a nombre de quien llega el
--    paquete y su documento, que no es lo mismo que `entregada_a`: uno es a
--    quien va dirigido, el otro quien lo retiro efectivamente.
-- ============================================================================

alter table public.correspondencia
  alter column categoria drop default,
  alter column categoria type text using categoria::text;

drop type public.categoria_correspondencia;

create type public.categoria_correspondencia as enum (
  'delivery',
  'sobres',
  'paqueteria'
);

alter table public.correspondencia
  alter column categoria type public.categoria_correspondencia
  using categoria::public.categoria_correspondencia;


alter table public.correspondencia
  add column destinatario_nombre     text,
  add column destinatario_documento  text;

comment on column public.correspondencia.destinatario_nombre is
  'A nombre de quien llega el paquete. Distinto de entregada_a, que es quien lo retiro.';
