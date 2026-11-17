-- Llamar a una persona de la vivienda, o a todos (17/11/2026).
--
-- Pedido del cliente: al llamar a una vivienda solo salía «Departamento 102»
-- y sonaba en todos. Ahora quien llama (portería o administración) elige a
-- quién: una persona de la vivienda que reciba llamadas por la app, o
-- «Todos». Con «Todos» suena en todos, contesta el primero y a los demás se
-- les deja de sonar (eso ya lo hacía `contestar_llamada` al pasar la llamada a
-- «en_curso»: el disparador manda el «fin» a los celulares y la app quita la
-- llamada que ya no suena).
--
-- Aditiva:
--   · columna nueva `llamada_internet.a_usuario_id` (nula = todos, como hasta
--     hoy: las versiones viejas de la app siguen igual);
--   · función nueva `llamar_a_quien` (con la persona elegida);
--   · `llamar_por_internet` (la que usa la app de hoy) pasa a llamar a la
--     nueva sin persona: misma firma, mismo resultado;
--   · `quienes_reciben_la_llamada`, `esta_en_la_llamada` y
--     `rechazar_llamada_de` respetan la persona elegida (si se eligió una,
--     solo a ella le suena, solo ella la ve y solo ella la contesta);
--   · `contestar_llamada`: si ya la contestó otra persona lo dice así («Ya
--     contestó otra persona»), y si la contestó uno mismo --dos toques, o
--     CallKit y la app a la vez-- no falla.
--   · parámetro nuevo `llamada_empieza_en_altavoz` (botón Altavoz).

alter table public.llamada_internet
  add column if not exists a_usuario_id uuid references public.perfil(id) on delete set null;

comment on column public.llamada_internet.a_usuario_id is
  'La persona de la vivienda a la que se llama, si quien llama eligió una (17/11/2026). Nulo: suena en todos los que reciben llamadas por la app y contesta el primero.';

create index if not exists llamada_internet_a_usuario_idx
  on public.llamada_internet (a_usuario_id) where a_usuario_id is not null;

-- La llamada, con la persona elegida o a todos.
create or replace function public.llamar_a_quien(
  p_destino public.destino_intercom,
  p_a_usuario_id uuid default null,
  p_a_unidad_id uuid default null,
  p_desde_unidad_id uuid default null,
  p_condominio_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid;
  v_origen     public.origen_intercom;
  v_id         uuid;
begin
  if p_desde_unidad_id is not null then
    -- Desde una vivienda: quien vive ahí o el huésped que está dentro hoy.
    if not (public.es_miembro_unidad(p_desde_unidad_id)
            or public.es_huesped_alojado(p_desde_unidad_id)) then
      raise exception 'Solo se llama desde una vivienda tuya';
    end if;
    if p_destino = 'vivienda' then
      raise exception 'Desde una vivienda se llama a la portería o a la administración';
    end if;
    v_condominio := public.condominio_de_unidad(p_desde_unidad_id);
    v_origen := 'vivienda';
  else
    v_condominio := coalesce(p_condominio_id, public.condominio_de_unidad(p_a_unidad_id));
    if v_condominio is null then
      raise exception 'Falta a quién llamas';
    end if;
    if p_destino <> 'administracion' and public.es_admin_condominio(v_condominio) then
      v_origen := 'administracion';
    elsif p_destino <> 'porteria' and public.porteria_puede_llamar(v_condominio) then
      v_origen := 'porteria';
    elsif public.es_personal_condominio(v_condominio) then
      raise exception 'La administracion no te habilito las llamadas';
    else
      raise exception 'No puedes llamar a ese destino desde aquí';
    end if;
  end if;

  if p_destino = 'vivienda' then
    if p_a_unidad_id is null then
      raise exception 'Falta la vivienda a la que llamas';
    end if;
    if public.condominio_de_unidad(p_a_unidad_id) is distinct from v_condominio then
      raise exception 'Esa vivienda no es de tu edificio';
    end if;
  end if;

  -- Una persona concreta, solo dentro de una vivienda.
  if p_a_usuario_id is not null and p_destino <> 'vivienda' then
    raise exception 'Solo se elige a una persona al llamar a una vivienda';
  end if;

  if not exists (
    select 1 from (
      select mc.usuario_id from public.membresia_condominio mc
      where mc.condominio_id = v_condominio and mc.activo and mc.usuario_id is not null
      union
      select m.usuario_id from public.membresia_unidad m
      where p_destino = 'vivienda' and m.unidad_id = p_a_unidad_id and m.activo
    ) gente
    where gente.usuario_id is distinct from auth.uid()
      and (p_a_usuario_id is null or gente.usuario_id = p_a_usuario_id)
      and public.le_suena_la_llamada(gente.usuario_id, p_destino, v_origen, v_condominio,
                                     case when p_destino = 'vivienda' then p_a_unidad_id end,
                                     auth.uid())
  ) then
    if p_a_usuario_id is not null then
      raise exception 'Esa persona no recibe llamadas por la app: elige «Todos» o llama por teléfono'
        using errcode = 'P0001';
    end if;
    raise exception 'Nadie recibe llamadas por la app ahí: llama por teléfono'
      using errcode = 'P0001';
  end if;

  insert into public.llamada_internet
    (condominio_id, de_usuario_id, de_unidad_id, destino, a_unidad_id, origen, a_usuario_id)
  values (v_condominio, auth.uid(), p_desde_unidad_id, p_destino,
          case when p_destino = 'vivienda' then p_a_unidad_id end, v_origen, p_a_usuario_id)
  returning id into v_id;
  return v_id;
end;
$$;

comment on function public.llamar_a_quien(public.destino_intercom, uuid, uuid, uuid, uuid) is
  'Empieza una llamada por la app (17/11/2026). Como llamar_por_internet, y al llamar a una vivienda se puede elegir a una persona (p_a_usuario_id); sin ella suena en todos y contesta el primero.';

grant execute on function public.llamar_a_quien(public.destino_intercom, uuid, uuid, uuid, uuid) to authenticated;

-- La de siempre (la app instalada hoy): a todos.
create or replace function public.llamar_por_internet(
  p_destino public.destino_intercom,
  p_a_unidad_id uuid default null,
  p_desde_unidad_id uuid default null,
  p_condominio_id uuid default null
)
returns uuid
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.llamar_a_quien(p_destino, null::uuid, p_a_unidad_id, p_desde_unidad_id, p_condominio_id);
$$;

-- A quiénes les suena: si se eligió a una persona, solo a ella.
create or replace function public.quienes_reciben_la_llamada(p_llamada_id uuid)
returns table(usuario_id uuid)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select distinct gente.usuario_id
  from public.llamada_internet l
  cross join lateral (
    select mc.usuario_id from public.membresia_condominio mc
    where mc.condominio_id = l.condominio_id and mc.activo and mc.usuario_id is not null
    union
    select m.usuario_id from public.membresia_unidad m
    where l.destino = 'vivienda' and m.unidad_id = l.a_unidad_id and m.activo
  ) gente
  where l.id = p_llamada_id
    and gente.usuario_id is distinct from l.de_usuario_id
    and (l.a_usuario_id is null or gente.usuario_id = l.a_usuario_id)
    and public.le_suena_la_llamada(gente.usuario_id, l.destino, l.origen, l.condominio_id,
                                   l.a_unidad_id, l.de_usuario_id);
$$;

-- Quién está en la llamada (y la puede ver): quien llama, quien contestó, y
-- a quien le suena (si se eligió a una persona, solo ella).
create or replace function public.esta_en_la_llamada(p_llamada_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.llamada_internet l
    where l.id = p_llamada_id
      and (
        l.de_usuario_id = auth.uid()
        or l.contestada_por = auth.uid()
        or ((l.a_usuario_id is null or l.a_usuario_id = auth.uid())
            and public.le_suena_la_llamada(auth.uid(), l.destino, l.origen, l.condominio_id,
                                           l.a_unidad_id, l.de_usuario_id))
      )
  );
$$;

create or replace function public.rechazar_llamada_de(p_llamada_id uuid, p_usuario_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  l public.llamada_internet%rowtype;
begin
  select * into l from public.llamada_internet where id = p_llamada_id for update;
  if l.id is null
     or l.de_usuario_id = p_usuario_id
     or (l.a_usuario_id is not null and l.a_usuario_id <> p_usuario_id)
     or not public.le_suena_la_llamada(p_usuario_id, l.destino, l.origen, l.condominio_id,
                                       l.a_unidad_id, l.de_usuario_id) then
    raise exception 'Esa llamada no es para ti';
  end if;
  if l.estado <> 'sonando' then
    return false;
  end if;
  update public.llamada_internet
     set estado = 'rechazada', terminada_en = now()
   where id = l.id;
  return true;
end;
$$;

-- Contesta el primero. Al segundo se le dice que ya contestó otra persona; a
-- quien ya la contestó (dos toques, CallKit y la app a la vez) no se le falla.
create or replace function public.contestar_llamada(p_llamada_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  l public.llamada_internet%rowtype;
begin
  select * into l from public.llamada_internet where id = p_llamada_id for update;
  if l.id is null or l.de_usuario_id = auth.uid() or not public.esta_en_la_llamada(l.id) then
    raise exception 'Esa llamada no es para ti';
  end if;
  if l.estado = 'en_curso' and l.contestada_por = auth.uid() then
    return;
  end if;
  if l.estado = 'en_curso' then
    raise exception 'Ya contestó otra persona';
  end if;
  if l.estado <> 'sonando' then
    raise exception 'Esa llamada ya no está sonando';
  end if;
  update public.llamada_internet
     set estado = 'en_curso', contestada_por = auth.uid(), contestada_en = now()
   where id = l.id;
end;
$$;

-- Con qué salida empieza la voz de la llamada: el altavoz o el auricular.
insert into public.configuracion_plataforma
  (clave, valor, descripcion, tipo, valor_por_defecto, ambito, categoria, riesgo, es_publico)
values
  ('llamada_empieza_en_altavoz', 'true',
   'Si la llamada por la app empieza por el altavoz (true) o por el auricular, pegado a la oreja (false). En la llamada hay un botón Altavoz para cambiarlo.',
   'booleano', 'true', 'plataforma', 'porteria', 'bajo', true)
on conflict (clave) do nothing;
