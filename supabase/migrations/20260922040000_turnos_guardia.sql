-- ============================================================================
-- 0018 · Turnos de los guardias
-- ============================================================================
-- El guardia ya existe como `membresia_condominio` con rol 'guardia', y su
-- porteria como FK: eso resuelve el campo `garita`, que era texto libre y que
-- la sesion del 22/07/2026 pidio renombrar por ser un termino regional. Al ser
-- una relacion, el nombre visible pasa a ser un dato editable y la decision de
-- producto deja de bloquear nada.
--
-- Faltaban los turnos. En el prototipo eran arrays embebidos dentro del
-- guardia: `turnos: [{dia, hora}]` y `overrides: [{fecha, horaInicio, horaFin}]`,
-- con el dia de la semana como texto libre ('Lunes', 'Miercoles' sin tilde).
--
-- Aqui son tablas, el dia es un entero ISO y las horas son `time`. Un turno
-- recurrente es el horario habitual; un override es el ajuste puntual de un
-- dia concreto, que es justo lo que el equipo pidio poder hacer.
-- ============================================================================

create table public.turno_guardia (
  id             uuid primary key default gen_random_uuid(),
  membresia_id   uuid not null references public.membresia_condominio(id) on delete cascade,
  dia_semana     smallint not null,          -- 0 = domingo (ISO)
  hora_inicio    time not null,
  hora_fin       time not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint turno_guardia_dia_valido check (dia_semana between 0 and 6),
  constraint turno_guardia_unico unique (membresia_id, dia_semana, hora_inicio)
);

create index turno_guardia_membresia_idx on public.turno_guardia (membresia_id);

comment on table public.turno_guardia is
  'Horario habitual del guardia. El dia es un entero ISO, no texto: en el prototipo convivian "Miercoles" con y sin tilde.';


-- Ajuste puntual de un dia concreto, por encima del turno habitual.
create table public.turno_override (
  id             uuid primary key default gen_random_uuid(),
  membresia_id   uuid not null references public.membresia_condominio(id) on delete cascade,
  fecha          date not null,
  hora_inicio    time,
  hora_fin       time,
  /** Sin horas = ese dia no trabaja. */
  motivo         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint turno_override_unico unique (membresia_id, fecha),
  constraint turno_override_horas_coherentes
    check (hora_inicio is null or hora_fin is null or hora_fin > hora_inicio)
);

create index turno_override_membresia_idx on public.turno_override (membresia_id);

comment on table public.turno_override is
  'Ajuste manual de un dia puntual. Sin horas significa que ese dia el guardia no trabaja.';


-- Datos del guardia que no son de la cuenta sino de su rol en el condominio.
alter table public.membresia_condominio
  add column documento       text,
  add column rotacion_activa boolean not null default false,
  add column tipo_rotacion   text;

comment on column public.membresia_condominio.documento is
  'Documento del guardia tal como lo registra la administracion. El de su cuenta vive en perfil.';


do $$
declare t text;
begin
  foreach t in array array['turno_guardia','turno_override'] loop
    execute format(
      'create trigger %I_tocar_updated_at before update on public.%I
         for each row execute function public.tocar_updated_at()', t, t);
  end loop;
end $$;


alter table public.turno_guardia  enable row level security;
alter table public.turno_override enable row level security;

-- Los turnos los ve el personal del condominio --el guardia necesita ver el
-- suyo-- y los fija la administracion.
do $$
declare t text;
begin
  foreach t in array array['turno_guardia','turno_override'] loop
    execute format(
      'create policy %I_lectura on public.%I for select to authenticated
         using (exists (select 1 from public.membresia_condominio mc
                        where mc.id = %I.membresia_id
                          and (mc.usuario_id = auth.uid()
                               or public.es_personal_condominio(mc.condominio_id))))',
      t, t, t);
    execute format(
      'create policy %I_escritura on public.%I for all to authenticated
         using (exists (select 1 from public.membresia_condominio mc
                        where mc.id = %I.membresia_id
                          and public.es_admin_condominio(mc.condominio_id)))
         with check (exists (select 1 from public.membresia_condominio mc
                        where mc.id = %I.membresia_id
                          and public.es_admin_condominio(mc.condominio_id)))',
      t, t, t, t);
  end loop;
end $$;
