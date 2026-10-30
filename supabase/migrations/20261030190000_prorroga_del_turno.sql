-- Prórroga del turno del guardia (30/10/2026).
--
-- Pedidos del cliente (Para Claude 177 y 178): cuando al guardia le queda una
-- hora o menos de turno, la app se lo avisa y le deja «Solicitar prórroga»:
-- hasta qué hora necesita seguir y por qué. A la administración le llega un
-- aviso push; abre el detalle y acepta o rechaza. Si la acepta, el guardia
-- sigue con la app abierta --y sigue recibiendo llamadas y S.O.S.-- hasta esa
-- hora. Si la rechaza, el turno termina a su hora.
--
-- Solo aditiva: un tipo, una tabla, dos motivos de aviso y funciones nuevas;
-- `guardia_atiende_ahora` se reemplaza para contar la prórroga aceptada.

do $$ begin
  create type public.estado_prorroga as enum ('pendiente', 'aceptada', 'rechazada');
exception when duplicate_object then null; end $$;

alter type public.motivo_notificacion add value if not exists 'prorroga_solicitada';
alter type public.motivo_notificacion add value if not exists 'prorroga_respondida';

create table if not exists public.prorroga_turno (
  id uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references public.condominio(id) on delete cascade,
  membresia_id uuid not null references public.membresia_condominio(id) on delete cascade,
  solicitada_por uuid not null default auth.uid() references auth.users(id) on delete cascade,
  hasta timestamptz not null,
  motivo text not null,
  estado public.estado_prorroga not null default 'pendiente',
  resuelta_por uuid references auth.users(id) on delete set null,
  resuelta_en timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prorroga_turno_con_motivo check (nullif(btrim(motivo), '') is not null)
);

comment on table public.prorroga_turno is
  'Lo que un guardia pide para seguir con la app después de su turno: hasta qué hora y por qué. La acepta o la rechaza la administración (Para Claude 178, 30/10/2026).';

create index if not exists prorroga_turno_por_membresia on public.prorroga_turno (membresia_id, hasta desc);

alter table public.prorroga_turno enable row level security;

drop policy if exists prorroga_turno_lectura on public.prorroga_turno;
create policy prorroga_turno_lectura on public.prorroga_turno
  for select using (solicitada_por = auth.uid() or public.es_admin_condominio(condominio_id));

grant select on public.prorroga_turno to authenticated;

drop trigger if exists prorroga_turno_tocar_updated_at on public.prorroga_turno;
create trigger prorroga_turno_tocar_updated_at
  before update on public.prorroga_turno
  for each row execute function public.tocar_updated_at();

-- De turno también con una prórroga aceptada que no ha vencido.
create or replace function public.guardia_atiende_ahora(p_condominio_id uuid, p_usuario_id uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select exists (
    select 1 from public.guardias_de_turno(p_condominio_id) g
    where g.usuario_id = p_usuario_id
  )
  or exists (
    select 1 from public.membresia_condominio m
    where m.condominio_id = p_condominio_id
      and m.usuario_id = p_usuario_id
      and m.rol = 'guardia'
      and m.activo
      and (
        (not exists (select 1 from public.turno_guardia t where t.membresia_id = m.id)
         and not exists (select 1 from public.turno_override o where o.membresia_id = m.id))
        -- La prórroga aceptada (30/10/2026).
        or exists (
          select 1 from public.prorroga_turno pr
          where pr.membresia_id = m.id and pr.estado = 'aceptada'
            and pr.hasta > now() and pr.created_at > now() - interval '1 day'
        )
      )
  );
$function$;

create or replace function public.solicitar_prorroga(p_condominio_id uuid, p_hasta text, p_motivo text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_membresia uuid;
  v_zona text;
  v_hasta timestamptz;
  v_id uuid;
  v_nombre text;
begin
  select m.id into v_membresia from public.membresia_condominio m
   where m.condominio_id = p_condominio_id and m.usuario_id = auth.uid()
     and m.rol = 'guardia' and m.activo;
  if v_membresia is null then
    raise exception 'Solo un guardia del edificio puede pedir una prórroga';
  end if;
  if nullif(btrim(coalesce(p_motivo, '')), '') is null then
    raise exception 'Falta el motivo de la prórroga';
  end if;
  if coalesce(p_hasta, '') !~ '^\d{2}:\d{2}$' then
    raise exception 'Falta hasta qué hora';
  end if;
  if exists (select 1 from public.prorroga_turno
             where membresia_id = v_membresia and estado = 'pendiente'
               and created_at > now() - interval '1 day') then
    raise exception 'Ya tienes una prórroga esperando respuesta';
  end if;

  select c.zona_horaria into v_zona from public.condominio c where c.id = p_condominio_id;
  -- Esa hora de hoy en el edificio; si ya pasó, la de mañana.
  v_hasta := ((now() at time zone v_zona)::date + p_hasta::time) at time zone v_zona;
  if v_hasta <= now() then
    v_hasta := v_hasta + interval '1 day';
  end if;

  insert into public.prorroga_turno (condominio_id, membresia_id, hasta, motivo)
  values (p_condominio_id, v_membresia, v_hasta, btrim(p_motivo))
  returning id into v_id;

  select coalesce(nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''), 'Un guardia')
    into v_nombre from public.perfil p where p.id = auth.uid();

  insert into public.notificacion (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select m.usuario_id, p_condominio_id, 'prorroga_solicitada', 'Solicitud de prórroga',
         coalesce(v_nombre, 'Un guardia') || ' pide seguir hasta las ' || p_hasta || ': ' || btrim(p_motivo),
         'prorroga_turno', v_id
  from public.membresia_condominio m
  where m.condominio_id = p_condominio_id and m.activo and m.usuario_id is not null
    and m.rol in ('administrador', 'coadministrador');

  return v_id;
end;
$function$;

create or replace function public.resolver_prorroga(p_id uuid, p_acepta boolean)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_pr record;
begin
  select * into v_pr from public.prorroga_turno where id = p_id for update;
  if v_pr.id is null or not public.es_admin_condominio(v_pr.condominio_id) then
    raise exception 'No tienes permiso para responder esta prórroga';
  end if;
  if v_pr.estado <> 'pendiente' then
    raise exception 'Esta prórroga ya se respondió';
  end if;

  update public.prorroga_turno
     set estado = case when p_acepta then 'aceptada'::public.estado_prorroga
                       else 'rechazada'::public.estado_prorroga end,
         resuelta_por = auth.uid(), resuelta_en = now()
   where id = p_id;

  insert into public.notificacion (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  values (v_pr.solicitada_por, v_pr.condominio_id, 'prorroga_respondida',
          case when p_acepta then 'Prórroga aceptada' else 'Prórroga rechazada' end,
          case when p_acepta
               then 'Puedes seguir usando la app hasta las ' || to_char(v_pr.hasta at time zone
                      (select c.zona_horaria from public.condominio c where c.id = v_pr.condominio_id), 'HH24:MI') || '.'
               else 'Tu turno termina a su hora.' end,
          'prorroga_turno', p_id);
end;
$function$;

-- Una prórroga, con el nombre de quien la pide, para el detalle.
create or replace function public.detalle_de_prorroga(p_id uuid)
 returns table(id uuid, guardia text, hasta timestamptz, motivo text, estado public.estado_prorroga, pedida_en timestamptz)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select pr.id,
         coalesce(nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''), m.nombre, 'Guardia'),
         pr.hasta, pr.motivo, pr.estado, pr.created_at
  from public.prorroga_turno pr
  join public.membresia_condominio m on m.id = pr.membresia_id
  left join public.perfil p on p.id = pr.solicitada_por
  where pr.id = p_id
    and (pr.solicitada_por = auth.uid() or public.es_admin_condominio(pr.condominio_id));
$function$;

-- La última prórroga del guardia que pregunta, para su aviso de fin de turno.
create or replace function public.mi_prorroga(p_condominio_id uuid)
 returns table(id uuid, hasta timestamptz, estado public.estado_prorroga)
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  select pr.id, pr.hasta, pr.estado
  from public.prorroga_turno pr
  where pr.condominio_id = p_condominio_id and pr.solicitada_por = auth.uid()
    and pr.created_at > now() - interval '1 day'
    and (pr.estado = 'pendiente' or pr.hasta > now())
  order by pr.created_at desc
  limit 1;
$function$;

revoke execute on function public.solicitar_prorroga(uuid, text, text) from public, anon;
revoke execute on function public.resolver_prorroga(uuid, boolean) from public, anon;
revoke execute on function public.detalle_de_prorroga(uuid) from public, anon;
revoke execute on function public.mi_prorroga(uuid) from public, anon;
grant execute on function public.solicitar_prorroga(uuid, text, text) to authenticated, service_role;
grant execute on function public.resolver_prorroga(uuid, boolean) to authenticated, service_role;
grant execute on function public.detalle_de_prorroga(uuid) to authenticated, service_role;
grant execute on function public.mi_prorroga(uuid) to authenticated, service_role;
