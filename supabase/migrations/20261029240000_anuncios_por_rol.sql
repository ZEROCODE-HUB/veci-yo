-- Anuncios y encuestas según el rol (29/10/2026, Para Claude 157-159).
--
-- Quien tiene varios roles (guardia y propietario, p. ej.) recibía el aviso de
-- una encuesta solo para la portería y la veía y podía votarla también como
-- propietario. El rol activo no viaja en el token (regla 8), así que:
--   · el aviso guarda a quién va dirigida la publicación (`audiencia`) y la
--     app lo enseña solo con el rol al que va;
--   · el voto se comprueba por cómo se vota: sin vivienda, como portería (solo
--     si la encuesta es para la portería, o la administración); con vivienda,
--     solo si esa vivienda y el papel que se tiene en ella están en la audiencia.
--   · las publicaciones avisan por Realtime, para que una borrada desaparezca
--     de la lista al momento.
-- Solo aditiva.

alter table public.notificacion add column if not exists audiencia jsonb;
comment on column public.notificacion.audiencia is
  'Para los avisos de anuncios y encuestas: a quién iba dirigida la publicación (propietarios, residentes, huespedes, porteria). La app enseña el aviso solo con un rol de esa audiencia. Nulo: para cualquier rol.';

create or replace function public.avisar_de_la_publicacion(p_publicacion_id uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_pub      record;
  v_titulo   text;
  v_cuantos  integer := 0;
begin
  select p.id, p.condominio_id, p.tipo, p.titulo, p.creada_por,
         p.avisar, p.avisado_en, p.publicada_desde, p.deleted_at,
         p.para_propietarios, p.para_residentes, p.para_huespedes, p.para_porteria
    into v_pub
  from public.publicacion p
  where p.id = p_publicacion_id;

  if v_pub.id is null or v_pub.deleted_at is not null then
    return 0;
  end if;

  if not v_pub.avisar then
    return 0;
  end if;

  if not public.ya_es_su_dia(v_pub.publicada_desde, v_pub.condominio_id) then
    return 0;
  end if;

  if v_pub.avisado_en is not null then
    return 0;
  end if;

  v_titulo := case
    when v_pub.tipo = 'encuesta' then 'Nueva encuesta'
    else 'Nuevo anuncio'
  end;

  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id, audiencia)
  select q.usuario_id, v_pub.condominio_id, 'anuncio_publicado',
         v_titulo, v_pub.titulo, 'publicacion', v_pub.id,
         jsonb_build_object(
           'propietarios', coalesce(v_pub.para_propietarios, false),
           'residentes', coalesce(v_pub.para_residentes, false),
           'huespedes', coalesce(v_pub.para_huespedes, false),
           'porteria', coalesce(v_pub.para_porteria, false))
  from public.quien_alcanza_la_publicacion(p_publicacion_id) q
  where (v_pub.creada_por is null or q.usuario_id <> v_pub.creada_por)
    and public.quiere_aviso(q.usuario_id, 'anuncio_publicado', 'app');

  get diagnostics v_cuantos = row_count;

  update public.publicacion set avisado_en = now() where id = p_publicacion_id;

  return v_cuantos;
end;
$function$;

-- Los avisos que ya estaban, con la audiencia de su publicación.
update public.notificacion n
   set audiencia = jsonb_build_object(
         'propietarios', coalesce(p.para_propietarios, false),
         'residentes', coalesce(p.para_residentes, false),
         'huespedes', coalesce(p.para_huespedes, false),
         'porteria', coalesce(p.para_porteria, false))
  from public.publicacion p
 where n.entidad_tipo = 'publicacion' and n.entidad_id = p.id and n.audiencia is null;

-- El voto, según cómo se vota.
create or replace function public.voto_segun_la_audiencia()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_pub record;
begin
  if auth.uid() is null then
    return new;
  end if;
  select p.condominio_id, p.para_propietarios, p.para_residentes, p.para_huespedes, p.para_porteria
    into v_pub
  from public.publicacion p where p.id = new.publicacion_id;

  if new.unidad_id is null then
    -- Sin vivienda: como portería (si la encuesta es para ella) o como
    -- administración.
    if public.es_admin_condominio(v_pub.condominio_id) then
      return new;
    end if;
    if coalesce(v_pub.para_porteria, false) and public.es_guardia_de_condominio(v_pub.condominio_id) then
      return new;
    end if;
    raise exception 'Esta encuesta no es para la portería';
  end if;

  if not exists (
    select 1 from public.membresia_unidad mu
     where mu.unidad_id = new.unidad_id
       and mu.usuario_id = auth.uid()
       and mu.activo
       and (
         (coalesce(v_pub.para_propietarios, false) and mu.rol = 'propietario')
         or (coalesce(v_pub.para_residentes, false) and mu.es_residente and mu.rol <> 'huesped_temporal')
         or (coalesce(v_pub.para_huespedes, false) and mu.rol = 'huesped_temporal')
       )
  ) then
    raise exception 'Esta encuesta no es para ti en esta vivienda';
  end if;
  return new;
end;
$$;
comment on function public.voto_segun_la_audiencia() is
  'Un voto con vivienda solo si el papel en esa vivienda está en la audiencia; sin vivienda, solo la portería (en encuestas para ella) o la administración (29/10/2026).';
drop trigger if exists voto_segun_la_audiencia on public.voto;
create trigger voto_segun_la_audiencia before insert on public.voto
  for each row execute function public.voto_segun_la_audiencia();

do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and tablename = 'publicacion') then
    alter publication supabase_realtime add table public.publicacion;
  end if;
end $$;
