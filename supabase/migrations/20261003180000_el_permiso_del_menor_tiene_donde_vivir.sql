-- ----------------------------------------------------------------------------
-- El permiso del menor tiene donde vivir
-- ----------------------------------------------------------------------------
-- «Menores sin padre o madre siempre pedir documentacion del responsable pues!»
-- --el cliente, 02/10/2026--. Ese papel no cabe en lo que hay:
--
--   · `verificacion_documento` es `unique (invitado_id)` y sus dos columnas son
--     `documento_original_path` y `documento_reverso_path`: **las dos caras de
--     una cedula**. Una autorizacion notarial no es la cara C de un documento
--     de identidad, y meterla ahi obligaria a que la porteria --que compara el
--     documento fisico contra esa fila-- tuviera que adivinar cual de los dos
--     archivos esta mirando.
--   · Y es de **otra persona**: el papel lo firma el responsable, no el niño.
--
-- Asi que va en su sitio. Una fila por menor: si se vuelve a subir, se
-- reemplaza --alguien saca la foto, sale movida, y la repite--.
--
-- Aditiva: tabla nueva, nada se borra.

create table if not exists public.autorizacion_menor (
  id             uuid primary key default gen_random_uuid(),

  -- El menor, no el responsable. `cascade` porque sin el niño el papel no
  -- significa nada: es la autorizacion **para esta estancia**, no un documento
  -- que valga por si solo.
  invitado_id    uuid not null unique
                 references public.invitado(id) on delete cascade,

  archivo_path   text not null,

  /*
    De quien es el papel, copiado al subirlo. No se deduce de
    `invitado.responsable_id` en el momento de leerlo: si el titular cambia de
    responsable despues de subir la autorizacion, el papel seguiria pareciendo
    valido para el nuevo. Aqui queda **a nombre de quien se firmo**.
  */
  responsable_id uuid references public.invitado(id) on delete set null,
  parentesco     public.parentesco,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.autorizacion_menor is
  'El permiso de quien no es padre ni madre para traer a un menor. Lo pidio el cliente el 02/10/2026; no cabia en verificacion_documento, que son las dos caras de una cedula y ademas del propio invitado.';

comment on column public.autorizacion_menor.responsable_id is
  'A nombre de quien se firmo, copiado al subirlo. Si despues se cambia el responsable del menor, este papel deja de corresponder y hay que subir otro.';

create index if not exists autorizacion_menor_responsable_idx
  on public.autorizacion_menor (responsable_id);

alter table public.autorizacion_menor enable row level security;

/*
  La misma politica que sus hermanas --`verificacion_documento`, `visita_evento`,
  `reporte_legal`-- y por el mismo motivo: hereda de su visita.

  Aqui importa que entre **la porteria**, no solo el anfitrion. El dia que ese
  niño llega a la puerta, el guardia tiene que poder ver si trae su permiso; con
  `es_anfitrion_del_invitado` --que es lo de la TRA, donde el guardia no pinta
  nada-- se quedaria mirando una lista sin el dato que necesita.

  Quien la escribe desde el preregistro no tiene sesion, asi que entra por la
  funcion de servidor con la clave de servicio, que se salta RLS.
*/
drop policy if exists autorizacion_menor_acceso on public.autorizacion_menor;

create policy autorizacion_menor_acceso on public.autorizacion_menor
  for all to authenticated
  using (
    exists (select 1 from public.invitado i
            where i.id = autorizacion_menor.invitado_id
              and public.puede_ver_visita(i.visita_id))
  )
  with check (
    exists (select 1 from public.invitado i
            where i.id = autorizacion_menor.invitado_id
              and public.puede_ver_visita(i.visita_id))
  );

drop trigger if exists autorizacion_menor_tocar_updated_at on public.autorizacion_menor;

create trigger autorizacion_menor_tocar_updated_at
  before update on public.autorizacion_menor
  for each row execute function public.tocar_updated_at();
