-- ----------------------------------------------------------------------------
-- Vehiculos de los residentes
-- ----------------------------------------------------------------------------
-- La pantalla de Configuracion del propietario deja registrar los vehiculos de
-- la vivienda, pero vivian en un `useState`: se perdian al salir de la
-- pantalla y no llegaban a la porteria, que es justamente quien necesita
-- saber que placa pertenece al edificio para distinguirla de una visita.
--
-- `vehiculo_visita` ya existe y es otra cosa: el coche con el que llega un
-- invitado, atado a esa visita concreta. Este es el del residente, atado a la
-- vivienda.

create table public.vehiculo_residente (
  id              uuid primary key default gen_random_uuid(),
  unidad_id       uuid not null references public.unidad(id) on delete cascade,
  placa           text not null,
  tipo            public.tipo_vehiculo not null,
  marca           text,
  color           text,
  registrado_por  uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,

  -- La placa identifica al vehiculo dentro del condominio: dos viviendas no
  -- pueden declarar la misma.
  constraint vehiculo_residente_placa_no_vacia check (length(btrim(placa)) > 0)
);

create unique index vehiculo_residente_placa_unica
  on public.vehiculo_residente (upper(btrim(placa)))
  where deleted_at is null;

create index vehiculo_residente_unidad_idx
  on public.vehiculo_residente (unidad_id) where deleted_at is null;

create trigger vehiculo_residente_tocar_updated_at
  before update on public.vehiculo_residente
  for each row execute function public.tocar_updated_at();

alter table public.vehiculo_residente enable row level security;

-- Lo gestiona quien vive en la unidad; lo consulta ademas el personal del
-- condominio, que es quien controla el ingreso.
create policy vehiculo_residente_lectura on public.vehiculo_residente
  for select to authenticated
  using (public.puede_operar_unidad(unidad_id));

create policy vehiculo_residente_escritura on public.vehiculo_residente
  for all to authenticated
  using (public.es_miembro_unidad(unidad_id))
  with check (public.es_miembro_unidad(unidad_id));

comment on policy vehiculo_residente_escritura on public.vehiculo_residente is
  'Solo quien vive en la unidad da de alta sus vehiculos. La porteria los lee pero no los cambia.';
