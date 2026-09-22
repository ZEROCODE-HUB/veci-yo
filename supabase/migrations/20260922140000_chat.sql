-- ----------------------------------------------------------------------------
-- Chat
-- ----------------------------------------------------------------------------
-- Los mensajes se agrupaban por el NOMBRE de la otra persona (`persona:
-- 'Mario'`), y `enviarMensaje` firmaba siempre como 'portero' sin mirar quién
-- estaba en sesión. Dos homónimos compartían conversación, cambiar de nombre
-- la partía en dos, y `leido` era un booleano único: si lo leía el guardia del
-- turno de mañana, aparecía leído para el de la tarde.
--
-- Al modelarlo aparece algo que el prototipo no distinguía: "Seguridad" y
-- "Administrador" no son personas, son áreas. Cualquier guardia de turno
-- atiende la conversación de portería, y quien escribe no espera hablar con
-- Roberto sino con la portería. Por eso hay tres clases de conversación y no
-- dos.

create type public.tipo_conversacion as enum (
  'directa',   -- entre dos personas concretas
  'area',      -- con la portería o con la administración, la atiende quien esté
  'grupo'      -- de todo el edificio
);

create type public.area_conversacion as enum ('seguridad', 'administracion');

create type public.ambito_grupo as enum ('residentes', 'propietarios');

create table public.conversacion (
  id              uuid primary key default gen_random_uuid(),
  condominio_id   uuid not null references public.condominio(id) on delete cascade,
  tipo            public.tipo_conversacion not null,

  -- Solo para 'area': con qué área se habla y desde qué vivienda. La unidad
  -- importa porque la portería necesita saber quién escribe, no solo quién es.
  area            public.area_conversacion,
  unidad_id       uuid references public.unidad(id) on delete cascade,

  -- Solo para 'grupo'.
  ambito          public.ambito_grupo,
  nombre          text,

  creada_por      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint conversacion_area_completa
    check (tipo <> 'area' or (area is not null and unidad_id is not null)),
  constraint conversacion_grupo_completo
    check (tipo <> 'grupo' or (ambito is not null and nombre is not null)),
  constraint conversacion_directa_sin_extras
    check (tipo <> 'directa' or (area is null and ambito is null))
);

-- Una sola conversación por unidad y área: si no, cada mensaje nuevo abriría
-- un hilo distinto con la portería.
create unique index conversacion_area_unica
  on public.conversacion (unidad_id, area) where tipo = 'area';

create unique index conversacion_grupo_unico
  on public.conversacion (condominio_id, ambito) where tipo = 'grupo';


-- ----------------------------------------------------------------------------
-- Participantes
-- ----------------------------------------------------------------------------
-- En las conversaciones directas define quién puede entrar. En las de área y
-- en los grupos la pertenencia se deriva del rol, y la fila existe solo para
-- guardar hasta dónde leyó cada quien: el booleano `leido` compartido hacía
-- que un mensaje leído por una persona apareciera leído para todas.

create table public.participante_conversacion (
  id                uuid primary key default gen_random_uuid(),
  conversacion_id   uuid not null references public.conversacion(id) on delete cascade,
  usuario_id        uuid not null references auth.users(id) on delete cascade,
  ultimo_leido_en   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint participante_unico unique (conversacion_id, usuario_id)
);


create table public.mensaje (
  id              uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversacion(id) on delete cascade,
  autor_id        uuid not null references auth.users(id) on delete cascade,
  -- El nombre viaja en la fila igual que en `reclamo`: `perfil` es privado, y
  -- además el mensaje debe seguir diciendo quién lo escribió aunque esa
  -- persona se dé de baja del condominio.
  autor_nombre    text not null,
  texto           text not null,
  enviado_en      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint mensaje_con_texto check (length(btrim(texto)) > 0)
);

create index mensaje_conversacion_idx
  on public.mensaje (conversacion_id, enviado_en desc);


-- ----------------------------------------------------------------------------
-- Quién puede ver una conversación
-- ----------------------------------------------------------------------------

create or replace function public.puede_ver_conversacion(p_conversacion_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.conversacion c
    where c.id = p_conversacion_id
      and case c.tipo
        -- Directa: hay que estar invitado.
        when 'directa' then exists (
          select 1 from public.participante_conversacion p
          where p.conversacion_id = c.id and p.usuario_id = auth.uid()
        )
        -- De área: la ve la unidad que escribe y el área que atiende. No la ve
        -- el resto del edificio, ni la administración si el hilo es con
        -- portería.
        when 'area' then
          public.es_miembro_unidad(c.unidad_id)
          or (c.area = 'seguridad'      and public.es_personal_condominio(c.condominio_id))
          or (c.area = 'administracion' and public.es_admin_condominio(c.condominio_id))
        -- Grupo: por rol. El de propietarios no lo ve un inquilino.
        when 'grupo' then
          case c.ambito
            when 'residentes' then exists (
              select 1 from public.membresia_unidad m
              join public.unidad u on u.id = m.unidad_id
              where m.usuario_id = auth.uid() and m.activo and m.es_residente
                and u.condominio_id = c.condominio_id
            )
            when 'propietarios' then exists (
              select 1 from public.membresia_unidad m
              join public.unidad u on u.id = m.unidad_id
              where m.usuario_id = auth.uid() and m.activo and m.rol = 'propietario'
                and u.condominio_id = c.condominio_id
            )
          end
      end
  );
$$;


alter table public.conversacion               enable row level security;
alter table public.participante_conversacion  enable row level security;
alter table public.mensaje                    enable row level security;

create policy conversacion_lectura on public.conversacion
  for select to authenticated using (public.puede_ver_conversacion(id));

-- Abrir una conversación con la portería o la administración es un derecho de
-- cualquier residente; abrir un grupo no, porque los grupos son del edificio.
create policy conversacion_alta on public.conversacion
  for insert to authenticated
  with check (
    creada_por = auth.uid()
    and (
      (tipo = 'area' and public.es_miembro_unidad(unidad_id))
      or (tipo = 'directa' and public.es_miembro_condominio(condominio_id))
      or (tipo = 'grupo' and public.es_admin_condominio(condominio_id))
    )
  );

create policy participante_lectura on public.participante_conversacion
  for select to authenticated using (public.puede_ver_conversacion(conversacion_id));

-- Cada quien marca su propia lectura. La fila se crea al entrar.
create policy participante_propio on public.participante_conversacion
  for all to authenticated
  using (usuario_id = auth.uid() and public.puede_ver_conversacion(conversacion_id))
  with check (usuario_id = auth.uid() and public.puede_ver_conversacion(conversacion_id));

create policy mensaje_lectura on public.mensaje
  for select to authenticated
  using (deleted_at is null and public.puede_ver_conversacion(conversacion_id));

create policy mensaje_alta on public.mensaje
  for insert to authenticated
  with check (autor_id = auth.uid() and public.puede_ver_conversacion(conversacion_id));

-- Un mensaje enviado no se edita: se borra lógicamente y se ve que se borró.
create policy mensaje_baja_propia on public.mensaje
  for update to authenticated
  using (autor_id = auth.uid())
  with check (autor_id = auth.uid());

comment on policy mensaje_baja_propia on public.mensaje is
  'Solo para fijar `deleted_at`. El texto de un mensaje ya enviado no se reescribe.';


do $$
declare t text;
begin
  foreach t in array array['conversacion','participante_conversacion','mensaje'] loop
    execute format(
      'create trigger %I_tocar_updated_at before update on public.%I
         for each row execute function public.tocar_updated_at()', t, t);
  end loop;
end $$;
