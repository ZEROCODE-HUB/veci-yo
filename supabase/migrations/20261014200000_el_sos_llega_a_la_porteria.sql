/*
  El S.O.S. llega a la porteria, y se cierra con una incidencia (14/10/2026).

  Lo pidio la responsable de producto: «las alertas S.O.S. deben llegar al
  guardia; la unica opcion es desactivarla y reportar incidencia: que fue,
  que vio; incidencia de PQRS».

  Hasta hoy la alarma llegaba como una fila mas de la campana, sin aviso en
  vivo, y el guardia no tenia como cerrarla: solo podia quien la activo.

  - `alarma_sos` entra en la publicacion de Realtime: la app de la porteria
    se entera al instante (RLS decide quien la recibe, como siempre).
  - `sos_activas()`: las abiertas del edificio, con vivienda y quien la
    activo, para la pantalla de la porteria.
  - `atender_sos(alarma, que_paso, que_vio)`: la unica salida. Crea una PQRS
    de seguridad enlazada a la alarma y la cierra como atendida, con quien.

  Solo aditiva.
*/

alter table public.reclamo
  add column if not exists alarma_sos_id uuid references public.alarma_sos(id);

comment on column public.reclamo.alarma_sos_id is
  'La alarma de S.O.S. de la que salio esta incidencia, cuando la porteria la cerro.';

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alarma_sos'
  ) then
    alter publication supabase_realtime add table public.alarma_sos;
  end if;
end $$;

create or replace function public.sos_activas()
returns table (
  id          uuid,
  activada_en timestamptz,
  unidad      text,
  torre       int,
  quien       text,
  telefono    text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.id, a.activada_en, u.codigo, t.numero::int,
         nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
         p.telefono
  from public.alarma_sos a
  left join public.unidad u on u.id = a.unidad_id
  left join public.torre t on t.id = u.torre_id
  left join public.perfil p on p.id = a.usuario_id
  where a.cerrada_en is null
    and public.es_personal_condominio(a.condominio_id)
  order by a.activada_en desc;
$$;

comment on function public.sos_activas() is
  'Las alarmas de S.O.S. abiertas de los edificios donde quien pregunta es personal (porteria o administracion).';

grant execute on function public.sos_activas() to authenticated;

create or replace function public.atender_sos(
  p_alarma_id uuid,
  p_que_paso  text,
  p_que_vio   text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a        public.alarma_sos%rowtype;
  v_unidad text;
  v_id     uuid;
begin
  select * into a from public.alarma_sos where id = p_alarma_id for update;
  if a.id is null then
    raise exception 'Esa alarma no existe';
  end if;
  if not public.es_personal_condominio(a.condominio_id) then
    raise exception 'Solo la porteria o la administracion atienden un S.O.S.';
  end if;
  if a.cerrada_en is not null then
    raise exception 'Esa alarma ya estaba cerrada';
  end if;
  if coalesce(btrim(p_que_paso), '') = '' or coalesce(btrim(p_que_vio), '') = '' then
    raise exception 'Escribe que paso y que viste: queda como incidencia';
  end if;

  select codigo into v_unidad from public.unidad where id = a.unidad_id;

  insert into public.reclamo (
    condominio_id, unidad_id, tipo, categoria, area, titulo, descripcion,
    creado_por, alarma_sos_id
  ) values (
    a.condominio_id, a.unidad_id, 'reclamo', 'seguridad', 'condominio',
    'Incidencia de S.O.S.' || coalesce(' · vivienda ' || v_unidad, ''),
    'Qué pasó: ' || btrim(p_que_paso) || chr(10) || 'Qué vio la portería: ' || btrim(p_que_vio),
    auth.uid(), a.id
  )
  returning id into v_id;

  update public.alarma_sos
     set cerrada_en  = now(),
         cerrada_por = auth.uid(),
         cierre      = 'atendida'
   where id = a.id;

  return v_id;
end;
$$;

comment on function public.atender_sos(uuid, text, text) is
  'La porteria desactiva un S.O.S.: crea la PQRS de seguridad con lo que paso y lo que vio, y cierra la alarma como atendida.';

grant execute on function public.atender_sos(uuid, text, text) to authenticated;
