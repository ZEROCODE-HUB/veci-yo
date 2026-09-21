-- ============================================================================
-- 0004 · Renta corta: configuración, suscripción y verificaciones
-- ============================================================================
-- Correcciones estructurales respecto del prototipo:
--
-- 1. `EstanciaConfig` guardaba booleanos como texto, con DOS grafías del mismo
--    valor ('Si' y 'Sí') conviviendo entre el store y los mock data, y la UI
--    parchada para leer ambas. Aquí son `boolean`.
-- 2. `estanciaMinima` guardaba un número dentro de una frase ('2 dias'). Aquí
--    es `integer`.
-- 3. La suscripción era `{activa, fechaActivacion, metodoPago:'VISA'}` sin ciclo
--    de facturación ni histórico. El modelo del 17/07/2026 describe una
--    suscripción mensual con paquete base que se resetea y paquetes
--    complementarios que no vencen en el mes: eso requiere periodos y
--    movimientos, no un booleano.
-- 4. `wifiPassword` y `doorPassword` viajaban en texto plano. Son credenciales
--    de acceso físico a una vivienda: van cifradas en Vault.
-- ============================================================================


create type public.estado_suscripcion as enum (
  'activa',
  'vencida',
  'cancelada'
);

create type public.origen_verificacion as enum (
  'paquete_base',          -- incluidas en la suscripción, se resetean cada mes
  'paquete_complementario' -- compradas aparte, vigencia más larga
);

create type public.resultado_verificacion as enum (
  'pendiente',
  'aprobada',
  'rechazada',
  'error_proveedor'
);

create type public.rol_staff_alojamiento as enum (
  'coanfitrion',
  'limpieza',
  'mantenimiento'
);


-- ----------------------------------------------------------------------------
-- config_renta_corta · una por unidad
-- ----------------------------------------------------------------------------
-- La suscripción es POR UNIDAD, no por usuario (decisión del 04/07/2026): un
-- propietario con cinco unidades se suscribe cinco veces.

create table public.config_renta_corta (
  id                        uuid primary key default gen_random_uuid(),
  unidad_id                 uuid not null references public.unidad(id) on delete cascade,

  -- Parámetros que fija el anfitrión.
  estancia_minima_noches    integer not null default 1,
  estancia_maxima_noches    integer,
  max_huespedes             integer not null default 1,
  num_habitaciones          integer,
  estacionamientos          integer not null default 0,
  permite_mascotas          boolean not null default false,
  apto_ninos                boolean not null default true,
  permite_visitas           boolean not null default false,
  permite_cocheras_visita   boolean not null default false,
  checkin_desde             time,
  checkin_hasta             time,
  checkin_24h               boolean not null default false,
  descripcion               text,

  -- Topes que impone el condominio. El anfitrión configura dentro de ellos.
  activa                    boolean not null default false,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint config_renta_corta_unica_por_unidad unique (unidad_id),
  constraint config_renta_corta_estancia_coherente
    check (estancia_maxima_noches is null or estancia_maxima_noches >= estancia_minima_noches),
  constraint config_renta_corta_minimo_positivo
    check (estancia_minima_noches >= 1),
  constraint config_renta_corta_checkin_coherente
    check (checkin_24h or checkin_desde is null or checkin_hasta is null or checkin_hasta > checkin_desde)
);

comment on table public.config_renta_corta is
  'Configuración de la función Huésped Temporal. Una por unidad; la suscripción también es por unidad.';


-- ----------------------------------------------------------------------------
-- limite_renta_corta_condominio · los topes del edificio
-- ----------------------------------------------------------------------------
-- El prototipo los guardaba como `capacidadMaximaAdmin` / `minDiasAdmin` dentro
-- de la config de la unidad, lo cual permitía que el anfitrión los editara.

create table public.limite_renta_corta_condominio (
  id                        uuid primary key default gen_random_uuid(),
  condominio_id             uuid not null references public.condominio(id) on delete cascade,
  estancia_minima_noches    integer,
  capacidad_maxima          integer,
  permite_renta_corta       boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint limite_renta_corta_unico unique (condominio_id)
);


-- ----------------------------------------------------------------------------
-- registro_turismo · el RNT
-- ----------------------------------------------------------------------------
-- El prototipo lo guardaba como `legal: { rnt: 'RNT-12345' }`, un string sin
-- vencimiento — de modo que la regla "sin RNT vigente no se puede emitir TRA"
-- era inaplicable. Solo el propietario de la unidad puede cargarlo.

create table public.registro_turismo (
  id            uuid primary key default gen_random_uuid(),
  unidad_id     uuid not null references public.unidad(id) on delete cascade,
  numero        text not null,
  emitido_en    date,
  vence_en      date,
  cargado_por   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint registro_turismo_unico_por_unidad unique (unidad_id)
);

create or replace function public.rnt_vigente(p_unidad_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.registro_turismo rt
    where rt.unidad_id = p_unidad_id
      and (rt.vence_en is null or rt.vence_en >= current_date)
  );
$$;

comment on function public.rnt_vigente is
  'Condición para poder emitir un TRA. Decisión del 17/07/2026: el número no se valida contra el Ministerio, pero el vencimiento sí se controla.';


-- ----------------------------------------------------------------------------
-- staff_alojamiento · coanfitriones y personal
-- ----------------------------------------------------------------------------
-- En el prototipo era `staff: [{id, nombre, rol:'coanfitrion', telefono}]`
-- dentro de la config. Al ser tabla puede tener cuenta asociada y permisos.

create table public.staff_alojamiento (
  id            uuid primary key default gen_random_uuid(),
  unidad_id     uuid not null references public.unidad(id) on delete cascade,
  usuario_id    uuid references auth.users(id) on delete set null,
  nombre        text not null,
  rol           public.rol_staff_alojamiento not null,
  telefono      text,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- suscripcion_renta_corta y sus periodos
-- ----------------------------------------------------------------------------
-- El cobro ocurre fuera de la app (web) para evitar la comisión de las tiendas
-- (decisión del 17/07/2026); aquí solo se refleja el estado.

create table public.suscripcion_renta_corta (
  id                    uuid primary key default gen_random_uuid(),
  unidad_id             uuid not null references public.unidad(id) on delete cascade,
  estado                public.estado_suscripcion not null default 'activa',
  iniciada_en           date not null default current_date,
  cancelada_en          date,
  verificaciones_base   integer not null default 20,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint suscripcion_renta_corta_unica_por_unidad unique (unidad_id)
);

-- Un periodo por ciclo mensual. El paquete base se resetea aquí, no se pisa.
create table public.periodo_suscripcion (
  id                    uuid primary key default gen_random_uuid(),
  suscripcion_id        uuid not null references public.suscripcion_renta_corta(id) on delete cascade,
  desde                 date not null,
  hasta                 date not null,
  verificaciones_base   integer not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint periodo_suscripcion_unico unique (suscripcion_id, desde),
  constraint periodo_suscripcion_rango check (hasta > desde)
);

-- Paquetes comprados aparte. No se resetean con el mes; vencen por fecha.
create table public.paquete_verificaciones (
  id              uuid primary key default gen_random_uuid(),
  unidad_id       uuid not null references public.unidad(id) on delete cascade,
  cantidad        integer not null,
  vence_en        date,
  comprado_en     timestamptz not null default now(),
  comprado_por    uuid references auth.users(id) on delete set null,
  monto           numeric(12,2),
  moneda          char(3),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint paquete_verificaciones_cantidad_positiva check (cantidad > 0)
);


-- ----------------------------------------------------------------------------
-- verificacion_antecedentes
-- ----------------------------------------------------------------------------
-- Corre automáticamente durante el precheck-in, sin intervención del anfitrión
-- ni visibilidad para el huésped. Cada verificación consume un cupo, y el
-- consumo se prioriza siempre desde el paquete base.

create table public.verificacion_antecedentes (
  id                  uuid primary key default gen_random_uuid(),
  invitado_id         uuid not null references public.invitado(id) on delete restrict,
  unidad_id           uuid not null references public.unidad(id) on delete restrict,
  origen              public.origen_verificacion not null,
  periodo_id          uuid references public.periodo_suscripcion(id) on delete set null,
  paquete_id          uuid references public.paquete_verificaciones(id) on delete set null,
  proveedor           text,
  resultado           public.resultado_verificacion not null default 'pendiente',
  referencia_externa  text,
  respuesta           jsonb,
  ejecutada_en        timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint verificacion_antecedentes_unica unique (invitado_id),
  constraint verificacion_antecedentes_origen_coherente
    check (
      (origen = 'paquete_base' and periodo_id is not null and paquete_id is null)
      or (origen = 'paquete_complementario' and paquete_id is not null and periodo_id is null)
    )
);

comment on table public.verificacion_antecedentes is
  'Consumo trazable: cada verificación dice de qué bolsa salió. El CHECK impide imputarla a las dos o a ninguna.';


-- ----------------------------------------------------------------------------
-- libro_huesped · credenciales de acceso a la vivienda
-- ----------------------------------------------------------------------------
-- Las contraseñas NO se guardan aquí: se almacenan cifradas en Vault y la tabla
-- solo guarda su identificador. Leerlas exige pasar por una función que
-- verifica autorización.

create table public.libro_huesped (
  id                      uuid primary key default gen_random_uuid(),
  unidad_id               uuid not null references public.unidad(id) on delete cascade,
  wifi_nombre             text,
  wifi_password_secret    uuid,   -- -> vault.secrets.id
  puerta_password_secret  uuid,   -- -> vault.secrets.id
  instrucciones           text,
  notas                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint libro_huesped_unico_por_unidad unique (unidad_id)
);

comment on column public.libro_huesped.wifi_password_secret is
  'Identificador en vault.secrets. Nunca la contraseña en claro.';


-- ----------------------------------------------------------------------------
-- Disparadores de updated_at
-- ----------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'config_renta_corta','limite_renta_corta_condominio','registro_turismo',
    'staff_alojamiento','suscripcion_renta_corta','periodo_suscripcion',
    'paquete_verificaciones','verificacion_antecedentes','libro_huesped'
  ] loop
    execute format(
      'create trigger %I_tocar_updated_at before update on public.%I
         for each row execute function public.tocar_updated_at()', t, t);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.config_renta_corta             enable row level security;
alter table public.limite_renta_corta_condominio  enable row level security;
alter table public.registro_turismo               enable row level security;
alter table public.staff_alojamiento              enable row level security;
alter table public.suscripcion_renta_corta        enable row level security;
alter table public.periodo_suscripcion            enable row level security;
alter table public.paquete_verificaciones         enable row level security;
alter table public.verificacion_antecedentes      enable row level security;
alter table public.libro_huesped                  enable row level security;

-- Todo lo que cuelga de una unidad: acceso para quien puede operarla.
do $$
declare t text;
begin
  foreach t in array array[
    'config_renta_corta','registro_turismo','staff_alojamiento',
    'suscripcion_renta_corta','paquete_verificaciones','libro_huesped'
  ] loop
    execute format(
      'create policy %I_acceso on public.%I for all to authenticated
         using (public.puede_operar_unidad(unidad_id))
         with check (public.puede_operar_unidad(unidad_id))', t, t);
  end loop;
end $$;

-- Límites del condominio: los ven los miembros, los fija la administración.
create policy limite_renta_corta_lectura on public.limite_renta_corta_condominio
  for select to authenticated using (public.es_miembro_condominio(condominio_id));
create policy limite_renta_corta_escritura on public.limite_renta_corta_condominio
  for all to authenticated
  using (public.es_admin_condominio(condominio_id))
  with check (public.es_admin_condominio(condominio_id));

create policy periodo_suscripcion_acceso on public.periodo_suscripcion
  for all to authenticated
  using (exists (select 1 from public.suscripcion_renta_corta s
                 where s.id = periodo_suscripcion.suscripcion_id
                   and public.puede_operar_unidad(s.unidad_id)))
  with check (exists (select 1 from public.suscripcion_renta_corta s
                 where s.id = periodo_suscripcion.suscripcion_id
                   and public.puede_operar_unidad(s.unidad_id)));

-- Antecedentes: el huésped NUNCA debe verlos. Solo el anfitrión de la unidad.
create policy verificacion_antecedentes_acceso on public.verificacion_antecedentes
  for all to authenticated
  using (public.puede_operar_unidad(unidad_id))
  with check (public.puede_operar_unidad(unidad_id));

comment on policy verificacion_antecedentes_acceso on public.verificacion_antecedentes is
  'Decisión del 16/07/2026: el huésped no ve la verificación ni sabe que existe.';
