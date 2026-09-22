-- ----------------------------------------------------------------------------
-- PQRS: alinear el modelo con el formulario real
-- ----------------------------------------------------------------------------
-- La tabla `reclamo` se creó a partir de los datos falsos, no del formulario.
-- Al mirar la pantalla aparecen cuatro vocabularios de "categoría" que no
-- coinciden entre sí:
--
--   · el schema:      categoria = convivencia | mantenimiento | seguridad | ...
--   · los mocks:      categoria = "Consulta" | "Reclamo" | "Sugerencia"
--                     (que es lo que el schema llama `tipo`, invertido)
--   · el formulario:  categoría = "Condominio" | "Aplicación VeciYo" |
--                     "Constructora TyC" | "Documentos antiguos"
--   · y además:       destinatario = "Administrador" | "Propietario" |
--                     "Aplicación"
--
-- Son tres ejes distintos, no tres nombres del mismo. Se separan:
--   `area`         a qué se dirige la PQRS (el eje que el formulario llama
--                  "categoría" y con el que filtra la lista);
--   `tipo`         qué es (pregunta, queja, reclamo, sugerencia, idea, soporte);
--   `categoria`    de qué trata; la clasifica la administración, no quien
--                  escribe, así que deja de ser obligatoria.

create type public.area_reclamo as enum (
  'condominio',
  'aplicacion',
  'constructora',
  'documentos_antiguos'
);

create type public.destinatario_reclamo as enum (
  'administrador',
  'propietario',
  'aplicacion'
);

create type public.medio_contacto as enum (
  'correo',
  'telefono',
  'cualquiera'
);

alter table public.reclamo
  add column area                     public.area_reclamo not null default 'condominio',
  add column destinatario             public.destinatario_reclamo,
  add column correo_contacto          text,
  add column telefono_contacto        text,
  add column medio_contacto_preferido public.medio_contacto,
  -- Solo tiene sentido cuando la PQRS es sobre la app: sirve para reproducir.
  add column modelo_dispositivo       text;

alter table public.reclamo
  alter column categoria drop not null;

comment on column public.reclamo.area is
  'A qué se dirige la PQRS. Es lo que el formulario llama "categoría" y con lo que filtra la lista.';
comment on column public.reclamo.categoria is
  'De qué trata. La clasifica la administración al revisarla; quien escribe no la elige.';

alter table public.reclamo
  add constraint reclamo_modelo_solo_para_app
  check (modelo_dispositivo is null or area = 'aplicacion');


-- ----------------------------------------------------------------------------
-- Numeración
-- ----------------------------------------------------------------------------
-- `numero` es lo que la persona cita cuando llama a la administración. Lo
-- generaba el cliente con `Math.random()`, así que dos PQRS podían salir con
-- el mismo número y el único aviso era el error de la restricción única.

create sequence if not exists public.reclamo_numero_seq;

create or replace function public.asignar_numero_reclamo()
returns trigger
language plpgsql
as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := lpad(nextval('public.reclamo_numero_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger reclamo_numerar
  before insert on public.reclamo
  for each row execute function public.asignar_numero_reclamo();

alter table public.reclamo alter column numero drop not null;


-- ----------------------------------------------------------------------------
-- Preguntas frecuentes
-- ----------------------------------------------------------------------------
-- Vivían como un array fijo en el cliente. Son contenido que la administración
-- querrá corregir sin publicar una versión de la app, y que cambia por
-- condominio (horarios, servicios).

create table public.pregunta_frecuente (
  id              uuid primary key default gen_random_uuid(),
  condominio_id   uuid not null references public.condominio(id) on delete cascade,
  categoria       text not null,
  pregunta        text not null,
  respuesta       text not null,
  orden           integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index pregunta_frecuente_condominio_idx
  on public.pregunta_frecuente (condominio_id, orden);

create trigger pregunta_frecuente_tocar_updated_at
  before update on public.pregunta_frecuente
  for each row execute function public.tocar_updated_at();

alter table public.pregunta_frecuente enable row level security;

create policy pregunta_frecuente_lectura on public.pregunta_frecuente
  for select to authenticated
  using (public.es_miembro_condominio(condominio_id));

create policy pregunta_frecuente_escritura on public.pregunta_frecuente
  for all to authenticated
  using (public.es_admin_condominio(condominio_id))
  with check (public.es_admin_condominio(condominio_id));


-- ----------------------------------------------------------------------------
-- Horario de atención
-- ----------------------------------------------------------------------------
-- La pantalla de contacto mostraba un teléfono de Ecuador, una dirección de
-- Perú y "VeciYomanda@gmail.com". El teléfono, el correo y la dirección ya
-- están en `condominio`; faltaba el horario.

alter table public.condominio
  add column horario_atencion text;

comment on column public.condominio.horario_atencion is
  'Texto libre a propósito: cada administración lo expresa a su manera ("L-V 10 a 18", "24h").';
