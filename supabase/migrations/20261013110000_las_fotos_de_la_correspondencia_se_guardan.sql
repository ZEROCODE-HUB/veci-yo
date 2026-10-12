-- ----------------------------------------------------------------------------
-- Las fotos de la correspondencia se guardan
-- ----------------------------------------------------------------------------
-- La pantalla de portería pedía «Sube una o varias fotos» y no las guardaba en
-- ningún sitio: `correspondencia` no tenía dónde, y no existía bucket. En el
-- informe de una incidencia era peor: lo que se guardaba en
-- `incidencia_correspondencia.fotos` era la dirección **local** de la foto en
-- el teléfono de quien la tomó (`blob:` o `file:`), que nadie más puede abrir.
-- Lo vio el cliente el 12/10/2026 al revisar la pantalla campo por campo.
--
-- Lo mismo con «Instrucciones adicionales», que la administración escribía y
-- se tiraba al guardar.
--
-- Solo aditiva.

alter table public.correspondencia
  add column if not exists fotos text[] not null default '{}',
  add column if not exists instrucciones text;

comment on column public.correspondencia.fotos is
  'Rutas dentro del bucket privado `correspondencia`, con la forma <id de la correspondencia>/<archivo>. Nunca una URL ni una direccion local.';
comment on column public.correspondencia.instrucciones is
  'Indicaciones de quien registra el envio, para quien lo entrega. Texto libre.';
comment on column public.incidencia_correspondencia.fotos is
  'Rutas dentro del bucket privado `correspondencia`, en la carpeta de la correspondencia a la que pertenece la incidencia.';

insert into storage.buckets (id, name, public)
values ('correspondencia', 'correspondencia', false)
on conflict (id) do nothing;

-- El primer segmento de la ruta es el id de la correspondencia. La lectura se
-- apoya en la política de la propia tabla: la subconsulta corre con la sesión
-- de quien pide, así que ve la foto quien ve el envío, y nadie más.
drop policy if exists correspondencia_lectura_fotos on storage.objects;
create policy correspondencia_lectura_fotos on storage.objects
  for select to authenticated
  using (
    bucket_id = 'correspondencia'
    and exists (
      select 1 from public.correspondencia c
      where c.id::text = (storage.foldername(name))[1]
    )
  );

-- Sube quien puede operar la vivienda del envío: la misma condición que el
-- alta de la correspondencia y la de sus incidencias.
drop policy if exists correspondencia_alta_fotos on storage.objects;
create policy correspondencia_alta_fotos on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'correspondencia'
    and exists (
      select 1 from public.correspondencia c
      where c.id::text = (storage.foldername(name))[1]
        and public.puede_operar_unidad(c.unidad_id)
    )
  );
