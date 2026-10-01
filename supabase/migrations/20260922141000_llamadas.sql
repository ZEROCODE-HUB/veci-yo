-- ----------------------------------------------------------------------------
-- Bitacora de llamadas
-- ----------------------------------------------------------------------------
-- El historial era un array de ocho llamadas a "Mario", "Ana" y "Carlos", con
-- la duracion como texto ('03:25') y el contacto como nombre suelto. Igual que
-- en el chat: dos personas con el mismo nombre comparten historial.
--
-- La app no cursa la llamada, la delega al telefono (`tel:`). Esta tabla es la
-- bitacora de a quien se llamo y cuando: es lo que la pantalla muestra y lo
-- que la porteria necesita para justificar un aviso.

create type public.tipo_llamada as enum ('entrante', 'saliente', 'perdida');

create table public.llamada (
  id                 uuid primary key default gen_random_uuid(),
  condominio_id      uuid not null references public.condominio(id) on delete cascade,
  de_usuario         uuid not null references auth.users(id) on delete cascade,
  -- A quien se llamo. Puede no tener cuenta -- se llama al telefono de la
  -- vivienda -- y por eso la unidad va aparte del usuario.
  a_usuario          uuid references auth.users(id) on delete set null,
  a_nombre           text not null,
  unidad_id          uuid references public.unidad(id) on delete set null,
  tipo               public.tipo_llamada not null,
  iniciada_en        timestamptz not null default now(),
  -- Segundos, no '03:25': la duracion es un numero (regla 5).
  duracion_segundos  integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint llamada_duracion_no_negativa check (duracion_segundos >= 0),
  constraint llamada_perdida_sin_duracion
    check (tipo <> 'perdida' or duracion_segundos = 0)
);

create index llamada_historial_idx
  on public.llamada (de_usuario, iniciada_en desc);

create trigger llamada_tocar_updated_at
  before update on public.llamada
  for each row execute function public.tocar_updated_at();

alter table public.llamada enable row level security;

-- El historial es de quien llama. La administracion no lo lee: saber a quien
-- llama un residente y cuanto habla no es asunto suyo.
create policy llamada_propia on public.llamada
  for select to authenticated
  using (de_usuario = auth.uid() or a_usuario = auth.uid());

create policy llamada_alta on public.llamada
  for insert to authenticated
  with check (de_usuario = auth.uid() and public.es_miembro_condominio(condominio_id));

comment on policy llamada_propia on public.llamada is
  'Solo las partes de la llamada. La administracion no ve a quien llama cada residente.';
