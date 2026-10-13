-- El profesional permanente se registra cada dia (decidido con el cliente,
-- 13/10/2026).
--
-- Una visita permanente --la empleada, el enfermero-- es una sola fila que no
-- caduca, y su invitado tiene **una** entrada y **una** salida. Asi que:
--
--   · el primer dia que salia, la visita pasaba a «finalizada» y la porteria
--     ya no podia volver a marcarle la entrada;
--   · no quedaba constancia de que dias vino: solo la ultima marca;
--   · y los dias que trabaja no se podian elegir: la tarjeta decia «Lun – Vie»
--     escrito a fuego para todo el mundo.
--
-- Ahora cada entrada y cada salida quedan en `jornada_visita`, un renglon por
-- vez que entra, y al salir el invitado vuelve a estar «por llegar» para el
-- dia siguiente. La vecina elige los dias; si viene otro dia, la porteria lo
-- ve avisado y queda anotado, pero no se le cierra la puerta (el KT, 4.1: los
-- limites se avisan, no bloquean).
--
-- Solo se añade: una columna, una tabla y un disparador.

alter table public.visita
  add column if not exists dias_trabajo smallint[];

alter table public.visita
  add constraint visita_dias_trabajo_de_la_semana
    check (dias_trabajo is null or dias_trabajo <@ array[0,1,2,3,4,5,6]::smallint[]);

comment on column public.visita.dias_trabajo is
  'Dias de la semana en que viene un profesional permanente: 0 domingo a 6 sabado. Vacio, sin dias decididos.';


create table if not exists public.jornada_visita (
  id            uuid primary key default gen_random_uuid(),
  visita_id     uuid not null references public.visita(id) on delete cascade,
  invitado_id   uuid not null references public.invitado(id) on delete cascade,
  -- El dia del edificio, no el del servidor.
  fecha         date not null,
  ingreso_en    timestamptz not null,
  salida_en     timestamptz,
  ingreso_por   uuid references auth.users(id) on delete set null,
  salida_por    uuid references auth.users(id) on delete set null,
  -- Vino un dia que no es de los suyos.
  fuera_de_dia  boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint jornada_sale_despues_de_entrar
    check (salida_en is null or salida_en >= ingreso_en)
);

create index if not exists jornada_visita_visita_idx
  on public.jornada_visita (visita_id, ingreso_en desc);
create index if not exists jornada_visita_invitado_idx
  on public.jornada_visita (invitado_id);
create index if not exists jornada_visita_ingreso_por_idx
  on public.jornada_visita (ingreso_por);
create index if not exists jornada_visita_salida_por_idx
  on public.jornada_visita (salida_por);

create trigger jornada_visita_tocar_updated_at
  before update on public.jornada_visita
  for each row execute function public.tocar_updated_at();

comment on table public.jornada_visita is
  'Cada vez que un profesional permanente entra y sale. La escribe un disparador al marcar la porteria; nadie la escribe a mano.';

alter table public.jornada_visita enable row level security;

-- Quien ve la visita ve sus jornadas. No hay politica de escritura: es
-- constancia de un hecho, y la deja el disparador.
create policy jornada_visita_lectura on public.jornada_visita
  for select to authenticated
  using (public.puede_ver_visita(visita_id));

grant select on public.jornada_visita to authenticated;
grant all on public.jornada_visita to service_role;


create or replace function public.jornada_del_permanente()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
declare
  v_tipo        public.tipo_visita;
  v_condominio  uuid;
  v_dias        smallint[];
  v_hoy         date;
  v_fuera       boolean;
  v_estaba      boolean;
  v_esta        boolean;
  v_abierta     uuid;
begin
  select v.tipo, v.condominio_id, v.dias_trabajo
    into v_tipo, v_condominio, v_dias
  from public.visita v
  where v.id = new.visita_id;

  if v_tipo is distinct from 'permanente' then
    return new;
  end if;

  v_hoy   := (now() at time zone public.zona_horaria_del_condominio(v_condominio))::date;
  v_fuera := v_dias is not null
             and cardinality(v_dias) > 0
             and not (extract(dow from v_hoy)::smallint = any (v_dias));
  v_esta  := coalesce(new.llego, false) or new.ingreso_en is not null;

  if tg_op = 'INSERT' then
    -- La porteria registrando a quien ya esta en la puerta.
    if v_esta then
      insert into public.jornada_visita
        (visita_id, invitado_id, fecha, ingreso_en, ingreso_por, fuera_de_dia)
      values
        (new.visita_id, new.id, v_hoy, coalesce(new.ingreso_en, now()), auth.uid(), v_fuera);
    end if;
    return new;
  end if;

  v_estaba := coalesce(old.llego, false) or old.ingreso_en is not null;

  select j.id into v_abierta
  from public.jornada_visita j
  where j.invitado_id = new.id and j.salida_en is null
  order by j.ingreso_en desc
  limit 1;

  if v_estaba and new.salida_en is not null and old.salida_en is null then
    -- Sale. Se cierra la jornada y el invitado vuelve a estar por llegar: si
    -- se quedara «salio», mañana no se le podria marcar la entrada.
    if v_abierta is not null then
      update public.jornada_visita
         set salida_en  = greatest(new.salida_en, ingreso_en),
             salida_por = auth.uid()
       where id = v_abierta;
    else
      -- Entro antes de que existiera este registro.
      insert into public.jornada_visita
        (visita_id, invitado_id, fecha, ingreso_en, salida_en, salida_por, fuera_de_dia)
      values
        (new.visita_id, new.id, v_hoy,
         least(coalesce(old.ingreso_en, new.salida_en), new.salida_en),
         new.salida_en, auth.uid(), v_fuera);
    end if;

    -- El estacionamiento de visita se suelta al salir: la visita permanente
    -- no pasa nunca a «finalizada», que es cuando lo soltaba el otro disparador.
    update public.asignacion_estacionamiento a
       set liberado_en = new.salida_en,
           updated_at  = now()
     where a.visita_id = new.visita_id
       and a.liberado_en is null;

    new.llego      := false;
    new.ingreso_en := null;
    new.salida_en  := null;
    return new;
  end if;

  if v_esta and not v_estaba then
    -- Entra.
    insert into public.jornada_visita
      (visita_id, invitado_id, fecha, ingreso_en, ingreso_por, fuera_de_dia)
    values
      (new.visita_id, new.id, v_hoy, coalesce(new.ingreso_en, now()), auth.uid(), v_fuera);
    return new;
  end if;

  if v_estaba and not v_esta and v_abierta is not null then
    -- La porteria desmarca una llegada apuntada por error: esa jornada no fue.
    delete from public.jornada_visita where id = v_abierta;
    return new;
  end if;

  if v_esta and v_estaba and v_abierta is not null
     and new.ingreso_en is not null
     and new.ingreso_en is distinct from old.ingreso_en then
    -- Se corrige la hora de entrada.
    update public.jornada_visita set ingreso_en = new.ingreso_en where id = v_abierta;
  end if;

  return new;
end;
$fn$;

revoke execute on function public.jornada_del_permanente() from public, anon, authenticated;

-- Dos disparadores: al insertar hace falta el id del invitado ya escrito, y
-- al actualizar hay que poder cambiar la fila antes de que se guarde.
create trigger invitado_jornada_del_permanente
  before update on public.invitado
  for each row execute function public.jornada_del_permanente();

create trigger invitado_jornada_del_permanente_alta
  after insert on public.invitado
  for each row execute function public.jornada_del_permanente();
