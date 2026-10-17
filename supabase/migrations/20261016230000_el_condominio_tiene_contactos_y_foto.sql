-- ============================================================================
-- Los contactos del edificio y su foto
-- ============================================================================
-- La maqueta de Arquitectura → Condominio pedía el equipo administrativo
-- (nombre, cargo, teléfono, correo) y las empresas de seguridad y limpieza. Se
-- habían retirado del formulario porque no tenían dónde guardarse. El cliente
-- decidió el 16/10/2026 que vuelvan, y que se vean donde ya se ve el contacto
-- de la administración: Perfil → Soporte → Contacto.
--
-- La foto del condominio también: se guarda, pero todavía no se sabe dónde se
-- enseña (hueco anotado; lo pregunta el cliente).
--
-- Solo aditiva.

create table if not exists public.contacto_condominio (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominio (id),
  tipo public.tipo_contacto_condominio not null,
  nombre text not null check (length(trim(nombre)) > 0),
  -- Solo del equipo: «Administrador», «Contador»… En una empresa, vacío.
  cargo text,
  telefono text,
  correo text,
  orden smallint not null default 0,
  creado_por uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Quitar un contacto lo marca: no se borra nada.
  deleted_at timestamptz
);

comment on table public.contacto_condominio is
  'El equipo administrativo y las empresas de seguridad y limpieza del edificio. Los carga la administración en Arquitectura → Condominio y los ven los miembros del edificio en Soporte → Contacto (16/10/2026).';

create index if not exists contacto_condominio_condominio_idx
  on public.contacto_condominio (condominio_id) where deleted_at is null;

alter table public.contacto_condominio enable row level security;

drop policy if exists contacto_condominio_lectura on public.contacto_condominio;
create policy contacto_condominio_lectura
  on public.contacto_condominio for select to authenticated
  using (
    public.es_miembro_condominio(condominio_id)
    or public.es_admin_condominio(condominio_id)
  );

drop policy if exists contacto_condominio_alta on public.contacto_condominio;
create policy contacto_condominio_alta
  on public.contacto_condominio for insert to authenticated
  with check (public.es_admin_condominio(condominio_id));

drop policy if exists contacto_condominio_cambio on public.contacto_condominio;
create policy contacto_condominio_cambio
  on public.contacto_condominio for update to authenticated
  using (public.es_admin_condominio(condominio_id))
  with check (public.es_admin_condominio(condominio_id));

grant select, insert, update on public.contacto_condominio to authenticated;

drop trigger if exists contacto_condominio_updated_at on public.contacto_condominio;
create trigger contacto_condominio_updated_at
  before update on public.contacto_condominio
  for each row execute function public.tocar_updated_at();

-- ----------------------------------------------------------------------------
-- La foto
-- ----------------------------------------------------------------------------
alter table public.condominio add column if not exists foto_path text;

comment on column public.condominio.foto_path is
  'La foto del condominio, en el bucket `condominios` (`<condominio_id>/foto-<hora>.<ext>`). Se carga en Arquitectura → Condominio. HUECO: falta decidir dónde se enseña (16/10/2026).';

insert into storage.buckets (id, name, public)
values ('condominios', 'condominios', false)
on conflict (id) do nothing;

drop policy if exists "condominios_lectura_foto" on storage.objects;
create policy "condominios_lectura_foto"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'condominios'
    and (
      public.es_miembro_condominio(((storage.foldername(name))[1])::uuid)
      or public.es_admin_condominio(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "condominios_alta_foto" on storage.objects;
create policy "condominios_alta_foto"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'condominios'
    and public.es_admin_condominio(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "condominios_cambio_foto" on storage.objects;
create policy "condominios_cambio_foto"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'condominios'
    and public.es_admin_condominio(((storage.foldername(name))[1])::uuid)
  );
