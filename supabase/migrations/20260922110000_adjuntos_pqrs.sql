-- ----------------------------------------------------------------------------
-- Adjuntos de PQRS
-- ----------------------------------------------------------------------------
-- "Adjuntar Documento" y "Adjuntar Imagen" eran dos botones sin `onPress`.
-- Una queja por ruido o una fuga se sostienen con una foto: sin adjuntos, la
-- administración recibe descripciones y nada más.
--
-- Mismo patrón que los comprobantes de reserva (migración 20260922002000):
-- bucket privado y la ruta lleva el id de la fila que da acceso.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pqrs', 'pqrs', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do nothing;

-- Quién puede ver los archivos de una PQRS: quien la abrió y la administración.
-- Es la misma regla que `reclamo_lectura`, escrita una vez para que el bucket
-- y la tabla no puedan divergir.
create or replace function public.puede_ver_reclamo(p_reclamo_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.reclamo r
    where r.id = p_reclamo_id
      and (r.creado_por = auth.uid() or public.es_admin_condominio(r.condominio_id))
  );
$$;

-- Convención de rutas: `<reclamo_id>/<archivo>`.
create policy "pqrs_lectura_adjuntos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pqrs'
    and public.puede_ver_reclamo(((storage.foldername(name))[1])::uuid)
  );

create policy "pqrs_alta_adjuntos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pqrs'
    and public.puede_ver_reclamo(((storage.foldername(name))[1])::uuid)
  );

create policy "pqrs_baja_adjuntos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'pqrs'
    and public.puede_ver_reclamo(((storage.foldername(name))[1])::uuid)
  );


-- El archivo vive en el bucket; la fila guarda con qué nombre lo subió la
-- persona, porque en la ruta se guarda con un nombre generado para evitar
-- colisiones entre dos "foto.jpg".
create table public.adjunto_reclamo (
  id              uuid primary key default gen_random_uuid(),
  reclamo_id      uuid not null references public.reclamo(id) on delete cascade,
  ruta            text not null unique,
  nombre_original text not null,
  tipo_mime       text not null,
  tamano_bytes    integer,
  subido_por      uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index adjunto_reclamo_reclamo_idx on public.adjunto_reclamo (reclamo_id);

create trigger adjunto_reclamo_tocar_updated_at
  before update on public.adjunto_reclamo
  for each row execute function public.tocar_updated_at();

alter table public.adjunto_reclamo enable row level security;

create policy adjunto_reclamo_lectura on public.adjunto_reclamo
  for select to authenticated using (public.puede_ver_reclamo(reclamo_id));

create policy adjunto_reclamo_alta on public.adjunto_reclamo
  for insert to authenticated
  with check (subido_por = auth.uid() and public.puede_ver_reclamo(reclamo_id));

create policy adjunto_reclamo_baja on public.adjunto_reclamo
  for delete to authenticated
  using (subido_por = auth.uid() or public.puede_ver_reclamo(reclamo_id));
