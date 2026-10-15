-- La tutela de un menor admite varios documentos (15/10/2026).
--
-- La maqueta del preregistro pedia, para un menor, «Documentacion de tutela
-- requerida» con el cargador «Carta de potestad / tutela notarial» y despues
-- «Documento adicional N»: una tutela notarial puede venir en varias hojas, o
-- acompañada de un poder. El cliente pidio recuperar esa interfaz tal cual.
--
-- `autorizacion_menor` guarda **el** papel principal --uno por menor, y de el
-- depende la regla de `cerrar_precheckin`--; esto guarda los demas, sin tocar
-- esa regla. Se leen igual que la autorizacion: quien puede ver la visita.

create table if not exists public.documento_tutela_adicional (
  id            uuid primary key default gen_random_uuid(),
  invitado_id   uuid not null references public.invitado(id) on delete cascade,
  archivo_path  text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.documento_tutela_adicional is
  'Documentos de tutela de un menor despues del principal (que vive en autorizacion_menor). Los sube la funcion subir-autorizacion-menor con adicional=true.';

create index if not exists documento_tutela_adicional_invitado_idx
  on public.documento_tutela_adicional (invitado_id);

alter table public.documento_tutela_adicional enable row level security;

drop policy if exists documento_tutela_adicional_lectura on public.documento_tutela_adicional;
create policy documento_tutela_adicional_lectura on public.documento_tutela_adicional
  for select to authenticated
  using (exists (
    select 1 from public.invitado i
    where i.id = documento_tutela_adicional.invitado_id
      and public.puede_ver_visita(i.visita_id)
  ));

drop trigger if exists documento_tutela_adicional_tocar_updated_at on public.documento_tutela_adicional;
create trigger documento_tutela_adicional_tocar_updated_at
  before update on public.documento_tutela_adicional
  for each row execute function public.tocar_updated_at();
