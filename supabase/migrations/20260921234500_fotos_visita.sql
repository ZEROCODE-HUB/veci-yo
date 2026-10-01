-- ============================================================================
-- 0011 · Fotos de ingreso y salida de las visitas
-- ============================================================================
-- El prototipo guardaba `fotosIngreso: string[]` con rutas locales del
-- dispositivo: no significaban nada fuera de ese telefono y se perdian al
-- cerrar la app. Aqui se guardan en Storage y la tabla referencia la ruta.
--
-- Son fotos que toma el guardia en porteria: pueden mostrar personas, vehiculos
-- y documentos. No pueden quedar en un bucket publico.
-- ============================================================================

alter table public.visita
  add column fotos_ingreso text[] not null default '{}',
  add column fotos_salida  text[] not null default '{}';

comment on column public.visita.fotos_ingreso is
  'Rutas dentro del bucket `visitas` de Storage, nunca URLs publicas.';


-- ----------------------------------------------------------------------------
-- Bucket privado
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visitas',
  'visitas',
  false,
  10485760,  -- 10 MB por archivo
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;


-- ----------------------------------------------------------------------------
-- Politicas de Storage
-- ----------------------------------------------------------------------------
-- Convencion de rutas: `<visita_id>/<archivo>`. La primera carpeta es el uuid
-- de la visita, y de ahi se deriva quien puede ver o subir la foto: exactamente
-- los mismos que pueden ver la visita.

create policy "visitas_lectura_fotos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'visitas'
    and public.puede_ver_visita(((storage.foldername(name))[1])::uuid)
  );

create policy "visitas_alta_fotos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'visitas'
    and public.puede_ver_visita(((storage.foldername(name))[1])::uuid)
  );

create policy "visitas_baja_fotos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'visitas'
    and public.puede_ver_visita(((storage.foldername(name))[1])::uuid)
  );
