-- Anotaciones de una visita: una bitácora, no dos casillas (30/10/2026).
--
-- Pedido del cliente (Para Claude 170): «Anotaciones de ingreso» y
-- «Anotaciones de salida» eran un texto por visita, así que lo que la
-- portería anotaba al recibir a una persona salía igual en el detalle de las
-- demás. Se pide que sea simplemente «anotación»: se escribe algo, se puede
-- subir un archivo, y queda junto al historial de entradas y salidas.
--
-- Cada anotación es una fila con su hora y quién la puso, y opcionalmente la
-- persona de la visita a la que se refiere. Es constancia de lo que pasó en la
-- portería: no se edita ni se borra. Las columnas viejas
-- (`anotaciones_ingreso`, `anotaciones_salida`, `fotos_*`) se quedan y se
-- siguen enseñando. Solo aditiva.

create table if not exists public.anotacion_visita (
  id uuid primary key default gen_random_uuid(),
  visita_id uuid not null references public.visita(id) on delete cascade,
  invitado_id uuid references public.invitado(id) on delete set null,
  texto text,
  archivos text[] not null default '{}',
  creada_por uuid not null default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anotacion_visita_con_algo check (
    nullif(btrim(coalesce(texto, '')), '') is not null or cardinality(archivos) > 0
  )
);

comment on table public.anotacion_visita is
  'Bitácora de la portería sobre una visita: cada anotación con su texto, sus archivos (rutas en el bucket «visitas»), la hora y quién la puso. No se edita ni se borra (30/10/2026).';
comment on column public.anotacion_visita.invitado_id is
  'La persona de la visita a la que se refiere, si es de una en concreto.';

create index if not exists anotacion_visita_por_visita on public.anotacion_visita (visita_id, created_at);

alter table public.anotacion_visita enable row level security;

drop policy if exists anotacion_visita_lectura on public.anotacion_visita;
create policy anotacion_visita_lectura on public.anotacion_visita
  for select using (public.puede_ver_visita(visita_id));

drop policy if exists anotacion_visita_alta on public.anotacion_visita;
create policy anotacion_visita_alta on public.anotacion_visita
  for insert with check (
    creada_por = auth.uid()
    and public.puede_ver_visita(visita_id)
    and exists (
      select 1 from public.visita v
      where v.id = visita_id and public.es_personal_condominio(v.condominio_id)
    )
  );

drop trigger if exists anotacion_visita_tocar_updated_at on public.anotacion_visita;
create trigger anotacion_visita_tocar_updated_at
  before update on public.anotacion_visita
  for each row execute function public.tocar_updated_at();

grant select, insert on public.anotacion_visita to authenticated;

-- Quién la puso, con su nombre: el perfil de la portería no lo ve cualquiera.
create or replace function public.anotaciones_de_la_visita(p_visita_id uuid)
 returns table(id uuid, invitado_id uuid, texto text, archivos text[], creada_en timestamptz, autor text)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select a.id, a.invitado_id, a.texto, a.archivos, a.created_at,
         nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), '')
  from public.anotacion_visita a
  left join public.perfil p on p.id = a.creada_por
  where a.visita_id = p_visita_id
    and public.puede_ver_visita(p_visita_id)
  order by a.created_at;
$function$;

revoke execute on function public.anotaciones_de_la_visita(uuid) from public, anon;
grant execute on function public.anotaciones_de_la_visita(uuid) to authenticated, service_role;
