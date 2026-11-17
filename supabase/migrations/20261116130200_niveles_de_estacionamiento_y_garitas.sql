-- ============================================================================
-- Niveles de estacionamiento y garitas por torre (16/11/2026)
-- ============================================================================
--
-- El cliente, el 16/11/2026:
--   · «Niveles de estacionamiento que hay, cómo se llama y su nomenclatura»
--     y «Ubicación obligatoria al crear Estacionamiento». La ubicación era un
--     texto libre opcional, así que cada estacionamiento decía lo que quisiera
--     quien lo escribió («Sótano -1», «S1», nada). Ahora el edificio declara
--     sus niveles una vez --Sótano 1 / S1, Primer piso / P1-- y cada
--     estacionamiento nuevo apunta a uno. El código se arma con la
--     nomenclatura: S1-01, S1-V01.
--   · «Hay 1 garita principal y luego las torres tienen garitas, o solo hay
--     una garita principal y una vehicular». La segunda forma ya cabía
--     (entrada_principal + acceso_vehicular); la primera no: una portería no
--     sabía de qué torre es.
--
-- Todo aditivo. `estacionamiento.nivel_id` es opcional en la base porque las
-- filas de antes no tienen nivel; lo obligatorio lo pide el formulario al crear.

-- ---------------------------------------------------------------------------
-- 1. El tipo nuevo de portería.
-- ---------------------------------------------------------------------------
-- `add value` no se puede usar en la misma transacción en que se crea, así que
-- este archivo no lo menciona en ninguna otra parte (ni en un `check`).
alter type public.tipo_porteria add value if not exists 'garita_torre';

-- ---------------------------------------------------------------------------
-- 2. Niveles de estacionamiento.
-- ---------------------------------------------------------------------------
create table if not exists public.nivel_estacionamiento (
  id             uuid primary key default gen_random_uuid(),
  condominio_id  uuid not null references public.condominio(id) on delete cascade,
  nombre         text not null check (length(btrim(nombre)) > 0),
  -- En mayúsculas y sin espacios ni guiones: va delante del código
  -- («S1-01»), y el guion es el separador.
  nomenclatura   text not null check (nomenclatura ~ '^[A-Z0-9]{1,6}$'),
  orden          integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint nivel_estacionamiento_nomenclatura_unica unique (condominio_id, nomenclatura),
  -- Para que el estacionamiento solo pueda apuntar a un nivel de su edificio.
  constraint nivel_estacionamiento_id_condominio unique (id, condominio_id)
);

comment on table public.nivel_estacionamiento is
  'Los niveles donde hay estacionamientos (Sótano 1 / S1, Primer piso / P1). '
  'La nomenclatura va delante del código de cada estacionamiento (16/11/2026).';

alter table public.nivel_estacionamiento enable row level security;

drop policy if exists nivel_estacionamiento_lectura on public.nivel_estacionamiento;
create policy nivel_estacionamiento_lectura on public.nivel_estacionamiento
  for select using (public.es_miembro_condominio(condominio_id));

drop policy if exists nivel_estacionamiento_escritura on public.nivel_estacionamiento;
create policy nivel_estacionamiento_escritura on public.nivel_estacionamiento
  for all using (public.es_admin_condominio(condominio_id))
  with check (public.es_admin_condominio(condominio_id));

revoke all on public.nivel_estacionamiento from public, anon;
grant select, insert, update, delete on public.nivel_estacionamiento to authenticated;
grant all on public.nivel_estacionamiento to service_role;

drop trigger if exists nivel_estacionamiento_tocar_updated_at on public.nivel_estacionamiento;
create trigger nivel_estacionamiento_tocar_updated_at
  before update on public.nivel_estacionamiento
  for each row execute function public.tocar_updated_at();

-- El nivel de cada estacionamiento. Con el condominio en la clave: un nivel de
-- otro edificio no se puede poner aunque se conozca su id. `restrict`: un
-- nivel con estacionamientos no se borra, se le quitan antes.
alter table public.estacionamiento
  add column if not exists nivel_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'estacionamiento_nivel_del_mismo_edificio'
  ) then
    alter table public.estacionamiento
      add constraint estacionamiento_nivel_del_mismo_edificio
      foreign key (nivel_id, condominio_id)
      references public.nivel_estacionamiento (id, condominio_id)
      on delete restrict;
  end if;
end $$;

create index if not exists estacionamiento_nivel_idx on public.estacionamiento (nivel_id);

comment on column public.estacionamiento.nivel_id is
  'El nivel donde está (16/11/2026). Opcional en la base por las filas de '
  'antes; el formulario lo pide al crear. `ubicacion` queda como detalle.';

-- ---------------------------------------------------------------------------
-- 3. La torre de una garita.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'torre_id_condominio') then
    alter table public.torre
      add constraint torre_id_condominio unique (id, condominio_id);
  end if;
end $$;

alter table public.porteria
  add column if not exists torre_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'porteria_torre_del_mismo_edificio'
  ) then
    -- `set null` solo sobre la torre: la garita sobrevive a una torre borrada
    -- y queda como garita sin torre, que se ve y se corrige.
    alter table public.porteria
      add constraint porteria_torre_del_mismo_edificio
      foreign key (torre_id, condominio_id)
      references public.torre (id, condominio_id)
      on delete set null (torre_id);
  end if;
end $$;

comment on column public.porteria.torre_id is
  'La torre de una garita de torre (tipo garita_torre). Vacía en las demás '
  '(16/11/2026).';
