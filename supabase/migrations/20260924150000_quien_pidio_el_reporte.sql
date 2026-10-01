-- ----------------------------------------------------------------------------
-- Quien pidio el reporte
-- ----------------------------------------------------------------------------
-- `solicitud_reporte` existe por una sola razon, y esta escrita en el comentario
-- de la propia tabla: un reporte lleva datos personales de los residentes
-- --quien entro, a que hora, a que unidad-- y quien lo pide tiene que quedar
-- asentado.
--
-- La columna `solicitada_por` se rellena sola con `auth.uid()`. Lo que faltaba
-- era poder **leerla con un nombre**: la clave foranea apunta a `auth.users`, y
-- PostgREST no sabe llegar desde ahi a `public.perfil`, asi que pedir el nombre
-- de quien solicito responde 400. Es exactamente el mismo hueco que dejaba la
-- bandeja de correspondencia vacia (ver `20260923220000_quien_registro_el_paquete`).
--
-- La identidad sigue siendo `auth.users.id` (regla 3); `perfil.id` es esa misma
-- columna, asi que la relacion ya existia y lo unico que se hace es declararla.
--
-- `on delete set null` igual que la de `auth.users`: si quien pidio el reporte
-- se da de baja, la solicitud no desaparece --el acceso a esos datos ocurrio--
-- pero se queda sin actor.

alter table public.solicitud_reporte
  drop constraint if exists solicitud_reporte_solicitada_por_perfil_fkey;
alter table public.solicitud_reporte
  add constraint solicitud_reporte_solicitada_por_perfil_fkey
  foreign key (solicitada_por) references public.perfil(id) on delete set null;

comment on constraint solicitud_reporte_solicitada_por_perfil_fkey on public.solicitud_reporte is
  'Declara la relacion con perfil para poder pedir el nombre de quien solicito en una sola consulta. La identidad sigue siendo auth.users.id.';
