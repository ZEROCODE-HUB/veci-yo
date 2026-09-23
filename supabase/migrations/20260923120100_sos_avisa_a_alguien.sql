-- ----------------------------------------------------------------------------
-- El S.O.S. avisa a alguien
-- ----------------------------------------------------------------------------
-- La pantalla de S.O.S. anuncia, con estas palabras:
--
--   "El boton de S.O.S activa una alarma sonora en la aplicacion que es
--    recibida por todos los guardias de seguridad de turno [...] Se brindan
--    los datos de la persona que activo la alarma: departamento, nombre y
--    demas datos relevantes."
--
-- Y luego, a pantalla completa: "ALARMA SONORA ACTIVADA, TODOS LOS GUARDIAS
-- SERAN NOTIFICADOS".
--
-- No se notificaba a nadie. Los dos botones --"Cancelar alarma" y "Llego el
-- guardia"-- hacian `navigation.goBack()`. Era la unica pantalla del producto
-- que afirma haber pedido auxilio sin haberlo pedido.
--
-- El KT lo tiene como hueco 10: "Alcance real del boton S.O.S.: destinatarios,
-- logica de disparo, integracion con notificaciones -- nunca paso por una
-- sesion de definicion de producto". Aqui se implementa solo lo que el texto
-- ya acordado dice, que responde a las tres cosas:
--
--   * destinatarios -> los guardias de turno del condominio;
--   * disparo       -> al insertar la alarma;
--   * payload       -> nombre y vivienda de quien la activo.
--
-- Queda pendiente de producto, y no se inventa aqui: el sonido en el
-- dispositivo, el push fuera de la app y el tiempo de respuesta esperado.
--
-- Una decision si hubo que tomar, y se marca como tal [SUPOSICION]: si no hay
-- ningun guardia de turno, avisa a la administracion. La alternativa era no
-- avisar a nadie, que es justo el defecto que se esta corrigiendo.
-- ----------------------------------------------------------------------------

-- Los turnos son `time` locales y hasta ahora se comparaban contra la hora del
-- telefono. El condominio dice en que huso vive; CO y PE son UTC-5 sin horario
-- de verano, pero eso es un dato del edificio, no una constante del codigo.
alter table public.condominio
  add column if not exists zona_horaria text not null default 'America/Bogota';

comment on column public.condominio.zona_horaria is
  'Huso del edificio (IANA). Los turnos de guardia son horas locales, no UTC.';


-- Un turno de 22:00 a 06:00 no cumple `inicio <= hora <= fin`: cruza medianoche.
create or replace function public.hora_dentro_de(
  p_hora time, p_inicio time, p_fin time
)
returns boolean
language sql
immutable
as $$
  select case
    when p_fin > p_inicio then p_hora >= p_inicio and p_hora < p_fin
    else p_hora >= p_inicio or p_hora < p_fin
  end;
$$;

comment on function public.hora_dentro_de(time, time, time) is
  'Si una hora cae dentro de un turno, incluido el que cruza medianoche (22:00-06:00).';


-- ----------------------------------------------------------------------------
-- Quien esta de turno ahora mismo
-- ----------------------------------------------------------------------------
-- Existia en el cliente (`chat.repo.ts`) y ignoraba los overrides: un guardia
-- con el dia libre marcado seguia contando como de turno. Aqui hay una sola
-- implementacion, y el ajuste del dia manda sobre el horario habitual.
create or replace function public.guardias_de_turno(p_condominio_id uuid)
returns table (usuario_id uuid, membresia_id uuid)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with ahora as (
    select (now() at time zone c.zona_horaria) as local
    from public.condominio c
    where c.id = p_condominio_id
  ),
  guardias as (
    select m.id, m.usuario_id
    from public.membresia_condominio m
    where m.condominio_id = p_condominio_id
      and m.rol = 'guardia'
      and m.activo
  )
  select g.usuario_id, g.id
  from guardias g
  cross join ahora a
  left join public.turno_override j
    on j.membresia_id = g.id and j.fecha = a.local::date
  where case
    when j.id is not null then
      -- Un override sin horas significa que hoy no trabaja.
      j.hora_inicio is not null
      and j.hora_fin is not null
      and public.hora_dentro_de(a.local::time, j.hora_inicio, j.hora_fin)
    else exists (
      select 1 from public.turno_guardia t
      where t.membresia_id = g.id
        and t.dia_semana = extract(dow from a.local)::smallint
        and public.hora_dentro_de(a.local::time, t.hora_inicio, t.hora_fin)
    )
  end;
$$;

comment on function public.guardias_de_turno(uuid) is
  'Guardias de turno ahora mismo, en la hora local del condominio. El override del dia manda sobre el horario habitual.';

revoke all on function public.guardias_de_turno(uuid) from public;
grant execute on function public.guardias_de_turno(uuid) to authenticated;


-- ----------------------------------------------------------------------------
-- La alarma
-- ----------------------------------------------------------------------------
create table if not exists public.alarma_sos (
  id             uuid primary key default gen_random_uuid(),
  condominio_id  uuid not null references public.condominio(id) on delete cascade,
  usuario_id     uuid not null references auth.users(id) on delete cascade,
  -- Desde que vivienda se activo: es el dato que la porteria necesita para
  -- llegar, y el texto de la pantalla lo promete ("departamento").
  unidad_id      uuid references public.unidad(id) on delete set null,

  activada_en    timestamptz not null default now(),

  -- Quien la cerro y como. Regla 2: con una FK, no con un nombre en texto.
  cerrada_en     timestamptz,
  cerrada_por    uuid references auth.users(id) on delete set null,
  cierre         public.cierre_sos,

  -- Cuanta gente recibio el aviso. Un cero es un dato que hay que mirar.
  avisados       integer not null default 0,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint alarma_sos_cierre_completo
    check (num_nulls(cerrada_en, cerrada_por, cierre) in (0, 3))
);

create index if not exists alarma_sos_condominio_idx
  on public.alarma_sos (condominio_id, activada_en desc);

comment on table public.alarma_sos is
  'Cada pulsacion del boton S.O.S. Se guarda aunque se cancele: una alarma cancelada sigue siendo un hecho del edificio.';

drop trigger if exists alarma_sos_updated_at on public.alarma_sos;
create trigger alarma_sos_updated_at
  before update on public.alarma_sos
  for each row execute function public.tocar_updated_at();


-- ----------------------------------------------------------------------------
-- El aviso
-- ----------------------------------------------------------------------------
create or replace function public.avisar_sos()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nombre    text;
  v_vivienda  text;
  v_mensaje   text;
  v_avisados  integer;
begin
  select trim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, ''))
    into v_nombre
  from public.perfil p where p.id = new.usuario_id;

  select 'Torre ' || t.numero || ' · ' || u.codigo
    into v_vivienda
  from public.unidad u
  join public.torre t on t.id = u.torre_id
  where u.id = new.unidad_id;

  -- El texto lo lee gente: va con tildes, aunque los comentarios de este
  -- archivo no las lleven.
  v_mensaje := coalesce(nullif(v_nombre, ''), 'Una persona')
    || ' activó el S.O.S.'
    || coalesce(' desde ' || v_vivienda, '')
    || '. Atender de inmediato.';

  -- Los guardias de turno. Si no hay ninguno, la administracion: no avisar a
  -- nadie no es una opcion en una alarma.
  with destinatarios as (
    select g.usuario_id from public.guardias_de_turno(new.condominio_id) g
    union
    select m.usuario_id
    from public.membresia_condominio m
    where m.condominio_id = new.condominio_id
      and m.rol in ('administrador', 'coadministrador')
      and m.activo
      and not exists (
        select 1 from public.guardias_de_turno(new.condominio_id)
      )
  ),
  insertadas as (
    insert into public.notificacion
      (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
    select d.usuario_id, new.condominio_id, 'sos_activado',
           'S.O.S. activado', v_mensaje, 'alarma_sos', new.id
    from destinatarios d
    where d.usuario_id <> new.usuario_id
    returning 1
  )
  select count(*) into v_avisados from insertadas;

  update public.alarma_sos set avisados = v_avisados where id = new.id;
  return null;
end;
$$;

drop trigger if exists alarma_sos_avisa on public.alarma_sos;
create trigger alarma_sos_avisa
  after insert on public.alarma_sos
  for each row execute function public.avisar_sos();

comment on function public.avisar_sos() is
  'Notifica a los guardias de turno; si no hay ninguno, a la administracion. Antes la pantalla lo anunciaba y no pasaba nada.';


-- ----------------------------------------------------------------------------
-- Quien puede que
-- ----------------------------------------------------------------------------
alter table public.alarma_sos enable row level security;

-- La activa quien vive o trabaja alli, y solo en su nombre.
drop policy if exists alarma_sos_activar on public.alarma_sos;
create policy alarma_sos_activar on public.alarma_sos
  for insert to authenticated
  with check (
    usuario_id = auth.uid()
    and public.es_miembro_condominio(condominio_id)
    and (unidad_id is null or exists (
      select 1 from public.membresia_unidad m
      where m.unidad_id = alarma_sos.unidad_id
        and m.usuario_id = auth.uid()
        and m.activo
    ))
  );

-- La ve quien la activo, y quien tiene que responderla.
drop policy if exists alarma_sos_leer on public.alarma_sos;
create policy alarma_sos_leer on public.alarma_sos
  for select to authenticated
  using (
    usuario_id = auth.uid()
    -- La porteria y la administracion: quien tiene que responderla.
    or public.es_personal_condominio(condominio_id)
  );

-- Cerrarla: quien la activo (la cancela) y quien la atiende. Nadie mas, y
-- nunca reabrirla.
drop policy if exists alarma_sos_cerrar on public.alarma_sos;
create policy alarma_sos_cerrar on public.alarma_sos
  for update to authenticated
  using (
    cerrada_en is null
    and (
      usuario_id = auth.uid()
      or public.es_personal_condominio(condominio_id)
    )
  )
  with check (cerrada_por = auth.uid());

-- No hay politica de delete a proposito: una alarma es un hecho del edificio,
-- y quien la provoca es justamente quien querria que desapareciera.
comment on policy alarma_sos_cerrar on public.alarma_sos is
  'Solo se cierra, nunca se reabre ni se borra. Una alarma cancelada sigue siendo un hecho.';
