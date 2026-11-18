-- ============================================================================
-- Los pasos para empezar que cada uno quita (18/11/2026, pedido del cliente)
-- ============================================================================
-- «Debe poder ocultar esa card o quitar alguna para quitarla de pendientes».
-- Se recuerda en la base, no en el teléfono: si se quita en el celular, no
-- vuelve a salir en otro. Cada uno ve y toca solo lo suyo.
--
-- `paso` es el identificador estable de la fila de la tarjeta
-- (`pasosParaEmpezar.ts`): «contacto», «vehiculos»… y «tarjeta» para la
-- tarjeta entera. Lo escribe la app, que es quien conoce los pasos.

create table if not exists public.paso_descartado (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  paso text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paso_descartado_paso_valido check (paso ~ '^[a-z_]{2,40}$'),
  constraint paso_descartado_uno_por_paso unique (usuario_id, paso)
);
comment on table public.paso_descartado is
  'Los pasos de «paso a paso» del inicio que cada persona quitó, o «tarjeta» si ocultó la tarjeta entera (18/11/2026).';

drop trigger if exists paso_descartado_tocar_updated_at on public.paso_descartado;
create trigger paso_descartado_tocar_updated_at before update on public.paso_descartado
  for each row execute function public.tocar_updated_at();

alter table public.paso_descartado enable row level security;

drop policy if exists paso_descartado_propio on public.paso_descartado;
create policy paso_descartado_propio on public.paso_descartado
  for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());
