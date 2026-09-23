-- ----------------------------------------------------------------------------
-- El PDF del reglamento
-- ----------------------------------------------------------------------------
-- R-52. `reglamento.archivo_path` existe desde el primer dia y esta vacia en
-- las tres filas de cada condominio, porque **nadie sube nada**:
--
--   * "Elegir archivo" del modal de carga no tenia mas accion que cerrar el
--     modal. Lo mismo "Aceptar".
--   * El modal de descarga mostraba el nombre de un archivo y un boton
--     "Aceptar" que tampoco descargaba: era un cartel.
--
-- Y el reglamento en PDF no es un adorno. El de renta corta es el que el RNT
-- exige poder presentar, y R-51 dice que el texto que hay sembrado —un
-- contrato de arrendamiento a veinte anios— no sirve para una estancia de
-- cuatro noches. Que el cliente pueda reemplazarlo **sin tocar codigo** era
-- justo lo que faltaba.
--
-- Mismo patron que los adjuntos de PQRS (20260922110000): bucket privado y la
-- ruta lleva el id de la fila que da acceso. Aqui el primer segmento es el
-- condominio, que es lo que decide quien puede leerlo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reglamentos', 'reglamentos', false, 10485760,
  -- La pantalla dice "Sube un PDF/Docx", asi que los dos. El RNT pide un
  -- documento presentable, no un formato concreto.
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  allowed_mime_types = excluded.allowed_mime_types,
  file_size_limit    = excluded.file_size_limit;

-- La misma regla que `reglamento_lectura`, escrita una vez para que el bucket
-- y la tabla no puedan divergir: lo lee quien vive o se aloja en el edificio.
create or replace function public.puede_ver_reglamento(p_condominio_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select public.es_miembro_condominio(p_condominio_id)
      or public.es_huesped_del_condominio(p_condominio_id);
$$;

comment on function public.puede_ver_reglamento(uuid) is
  'Quien puede leer el reglamento de un condominio. La misma condicion que `reglamento_lectura`, para que la tabla y el bucket no diverjan.';

revoke all on function public.puede_ver_reglamento(uuid) from public;
grant execute on function public.puede_ver_reglamento(uuid) to authenticated;

-- Convencion de rutas: `<condominio_id>/<tipo>-<marca de tiempo>.<ext>`.
drop policy if exists "reglamentos_lectura" on storage.objects;
create policy "reglamentos_lectura"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'reglamentos'
    and public.puede_ver_reglamento(((storage.foldername(name))[1])::uuid)
  );

-- Subirlo y reemplazarlo es de la administracion, como la propia fila.
drop policy if exists "reglamentos_alta" on storage.objects;
create policy "reglamentos_alta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'reglamentos'
    and public.es_admin_condominio(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "reglamentos_cambio" on storage.objects;
create policy "reglamentos_cambio"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'reglamentos'
    and public.es_admin_condominio(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'reglamentos'
    and public.es_admin_condominio(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "reglamentos_baja" on storage.objects;
create policy "reglamentos_baja"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'reglamentos'
    and public.es_admin_condominio(((storage.foldername(name))[1])::uuid)
  );

comment on column public.reglamento.archivo_path is
  'Ruta en el bucket `reglamentos`, con el condominio como primer segmento. Vacia mientras el condominio no haya subido su PDF: entonces la pantalla no ofrece descarga.';
