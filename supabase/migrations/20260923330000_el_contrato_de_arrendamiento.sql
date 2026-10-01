-- ----------------------------------------------------------------------------
-- El contrato de arrendamiento
-- ----------------------------------------------------------------------------
-- Habia dos pantallas de contrato y ninguna tabla:
--
--   * `PropietarioCrearRol` pide fecha de inicio, duracion, monto de alquiler,
--     monitoreo de pago y servicios incluidos, y lo escribia todo en
--     `propietario-store`, un store de Zustand. Se perdia al recargar.
--   * `PropietarioHistorialContrato` mostraba **dos contratos inventados**,
--     escritos a mano en el propio archivo: "Contrato N° 16548", uno "Activa"
--     y otro "Finalizado", con fechas de 2024 y 2025 para cualquier vivienda
--     de cualquier condominio.
--
-- No es inventar producto: el KT lista "ver historial de contrato" entre las
-- capacidades del Propietario, las dos pantallas estan construidas y el
-- formulario ya define los campos. Lo que faltaba era donde guardarlo.
--
-- Lo que **no** se hace aqui: un modulo de cobros. `monitorea_pago` se guarda
-- porque el formulario lo pide, pero ninguna pantalla habla de recordatorios,
-- de conciliacion bancaria ni de estados de pago, y eso no se inventa.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_contrato') then
    create type public.estado_contrato as enum ('vigente', 'finalizado', 'cancelado');
  end if;
end $$;

create sequence if not exists public.contrato_numero_seq;

create table if not exists public.contrato_arrendamiento (
  id             uuid primary key default gen_random_uuid(),
  unidad_id      uuid not null references public.unidad(id) on delete cascade,
  -- El inquilino, por su membresia en esa vivienda. `set null` y no `cascade`:
  -- si la persona se va, el contrato sigue siendo parte del historial.
  membresia_id   uuid references public.membresia_unidad(id) on delete set null,
  numero         text unique,
  fecha_inicio   date not null,
  fecha_fin      date,
  duracion_meses integer check (duracion_meses is null or duracion_meses > 0),
  monto          numeric(12,2) check (monto is null or monto >= 0),
  moneda         char(3),
  monitorea_pago boolean not null default false,
  -- Que servicios entran en el alquiler. El formulario los ofrece como una
  -- lista de casillas, y cual sea la lista es cosa de cada contrato.
  servicios      jsonb not null default '{}'::jsonb,
  -- Las clausulas particulares. Las generales son el reglamento del
  -- condominio, que ya vive en `reglamento`: la pantalla mostraba **el mismo
  -- texto** copiado aqui y alli.
  texto          text,
  archivo_path   text,
  estado         public.estado_contrato not null default 'vigente',
  registrado_por uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,

  constraint contrato_fechas_coherentes
    check (fecha_fin is null or fecha_fin > fecha_inicio),
  -- Regla 5: un importe sin moneda no se puede ni mostrar ni sumar.
  constraint contrato_importe_con_moneda
    check ((monto is null and moneda is null) or (monto is not null and moneda is not null))
);

comment on table public.contrato_arrendamiento is
  'El contrato entre el propietario y quien le alquila. La pantalla de historial mostraba dos contratos inventados escritos a mano.';
comment on column public.contrato_arrendamiento.texto is
  'Clausulas particulares. Las generales son el reglamento del condominio, en `reglamento`: la pantalla llevaba el mismo texto copiado en los dos sitios.';
comment on column public.contrato_arrendamiento.monitorea_pago is
  'El formulario lo pide. No hay modulo de cobros detras, y ninguna pantalla lo pide: se guarda la intencion, no se inventa el resto.';

create index if not exists contrato_unidad_idx
  on public.contrato_arrendamiento (unidad_id) where deleted_at is null;
create index if not exists contrato_membresia_idx
  on public.contrato_arrendamiento (membresia_id) where membresia_id is not null;

-- `numero` es lo que se cita al hablar del contrato. Lo asigna la base, como
-- en `reclamo`: que lo sortee el cliente termina en dos con el mismo.
create or replace function public.asignar_numero_contrato()
returns trigger
language plpgsql
as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := lpad(nextval('public.contrato_numero_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists contrato_numerar on public.contrato_arrendamiento;
create trigger contrato_numerar
  before insert on public.contrato_arrendamiento
  for each row execute function public.asignar_numero_contrato();

drop trigger if exists contrato_tocar_updated_at on public.contrato_arrendamiento;
create trigger contrato_tocar_updated_at
  before update on public.contrato_arrendamiento
  for each row execute function public.tocar_updated_at();


-- ----------------------------------------------------------------------------
-- Quien ve un contrato
-- ----------------------------------------------------------------------------
-- Las dos partes, y nadie mas.
--
-- La administracion del condominio **no**: cuanto paga de alquiler un vecino a
-- otro no es asunto del edificio. Es la misma linea que ya se traza con los
-- comprobantes de pago, que llevan datos bancarios, y con el chat entre un
-- residente y la porteria. Por eso la condicion se escribe entera aqui y no se
-- reutiliza `puede_invitar_a_unidad`, que deja pasar a la administracion con
-- permiso de residentes.
create or replace function public.es_parte_del_contrato(
  p_unidad_id    uuid,
  p_membresia_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    -- Quien alquila: el dueño de la vivienda o el inquilino lider que la
    -- gestiona en su nombre.
    exists (
      select 1 from public.membresia_unidad mu
      where mu.unidad_id = p_unidad_id
        and mu.usuario_id = auth.uid()
        and mu.activo
        and mu.rol in ('propietario', 'inquilino_lider')
    )
    -- O la persona a la que el contrato se refiere: es el suyo.
    or exists (
      select 1 from public.membresia_unidad mu
      where mu.id = p_membresia_id
        and mu.usuario_id = auth.uid()
        and mu.activo
    );
$$;

comment on function public.es_parte_del_contrato(uuid, uuid) is
  'Las dos partes de un contrato de arrendamiento. La administracion del condominio no entra: lo que un vecino le cobra a otro no es asunto del edificio.';

revoke all on function public.es_parte_del_contrato(uuid, uuid) from public;
grant execute on function public.es_parte_del_contrato(uuid, uuid) to authenticated;

alter table public.contrato_arrendamiento enable row level security;

drop policy if exists contrato_lectura on public.contrato_arrendamiento;
create policy contrato_lectura on public.contrato_arrendamiento
  for select to authenticated
  using (deleted_at is null and public.es_parte_del_contrato(unidad_id, membresia_id));

-- Escribirlo es de quien alquila, no de quien alquila**do**: el inquilino lo
-- lee, no lo redacta.
drop policy if exists contrato_alta on public.contrato_arrendamiento;
create policy contrato_alta on public.contrato_arrendamiento
  for insert to authenticated
  with check (
    registrado_por = auth.uid()
    and exists (
      select 1 from public.membresia_unidad mu
      where mu.unidad_id = contrato_arrendamiento.unidad_id
        and mu.usuario_id = auth.uid()
        and mu.activo
        and mu.rol in ('propietario', 'inquilino_lider')
    )
  );

drop policy if exists contrato_cambio on public.contrato_arrendamiento;
create policy contrato_cambio on public.contrato_arrendamiento
  for update to authenticated
  using (exists (
    select 1 from public.membresia_unidad mu
    where mu.unidad_id = contrato_arrendamiento.unidad_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      and mu.rol in ('propietario', 'inquilino_lider')
  ))
  with check (exists (
    select 1 from public.membresia_unidad mu
    where mu.unidad_id = contrato_arrendamiento.unidad_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      and mu.rol in ('propietario', 'inquilino_lider')
  ));

-- Un contrato no se borra: se finaliza o se cancela, y queda en el historial.
-- Que es justamente lo que la pantalla se llama.

grant select, insert, update on public.contrato_arrendamiento to authenticated;


-- ----------------------------------------------------------------------------
-- El contacto de emergencia
-- ----------------------------------------------------------------------------
-- El mismo formulario pide "contacto en caso de emergencia" --nombre, codigo de
-- pais y telefono-- y tampoco tenia donde ir. Va en la membresia y no en el
-- perfil porque tiene que funcionar para quien **no tiene cuenta**: un menor
-- registrado por su madre, alguien dado de alta antes de aceptar la
-- invitacion. Es justamente de esas personas de quien mas falta hace saber a
-- quien llamar.
alter table public.membresia_unidad
  add column if not exists contacto_emergencia_nombre   text,
  add column if not exists contacto_emergencia_codigo   text,
  add column if not exists contacto_emergencia_telefono text;

comment on column public.membresia_unidad.contacto_emergencia_nombre is
  'A quien llamar si le pasa algo a esta persona. Va en la membresia y no en el perfil porque tiene que servir tambien para quien no tiene cuenta.';


-- ----------------------------------------------------------------------------
-- La moneda la pone el condominio
-- ----------------------------------------------------------------------------
-- `condominio.moneda` ya dice en que se cobra en ese edificio. Pedirsela otra
-- vez al cliente solo abre la puerta a que un contrato de Bogota diga PEN
-- porque la pantalla mando lo que tenia a mano.
create or replace function public.moneda_del_contrato()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.monto is not null and new.moneda is null then
    select c.moneda into new.moneda
    from public.unidad u
    join public.condominio c on c.id = u.condominio_id
    where u.id = new.unidad_id;
  end if;
  return new;
end;
$$;

comment on function public.moneda_del_contrato() is
  'Si el contrato trae importe y no moneda, se usa la del condominio. La restriccion exige las dos, y quien escribe no tiene por que saberla.';

drop trigger if exists contrato_moneda on public.contrato_arrendamiento;
create trigger contrato_moneda
  before insert or update on public.contrato_arrendamiento
  for each row execute function public.moneda_del_contrato();
