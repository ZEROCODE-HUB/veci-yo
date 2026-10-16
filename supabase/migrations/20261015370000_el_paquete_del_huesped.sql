-- ----------------------------------------------------------------------------
-- El paquete del huésped (15/10/2026, hueco 17)
-- ----------------------------------------------------------------------------
-- Al huésped temporal no le llegaba nada de la correspondencia, ni siquiera lo
-- suyo: el aviso excluye al huésped a propósito --la correspondencia de la
-- vivienda es del propietario, y el aviso lleva el nombre de la empresa-- y el
-- módulo se le oculta. Así que el paquete que el huésped pidió a la dirección
-- de su alojamiento llegaba a portería y nadie se lo decía.
--
-- La portería ya anota a quién va dirigido: nombre y documento. Con eso basta.
-- Si coincide con un huésped alojado hoy en esa vivienda --el documento, o el
-- nombre completo--, el paquete queda a su nombre: le llega el aviso y lo ve.
-- Solo los suyos: los del propietario siguen sin llegarle.
--
-- La columna la pone siempre la base. Si se pudiera escribir desde la API,
-- cualquiera con permiso de registrar un paquete podría hacérselo leer a quien
-- quisiera.

alter table public.correspondencia
  add column if not exists huesped_id uuid references auth.users(id) on delete set null;

comment on column public.correspondencia.huesped_id is
  'El huésped alojado al que va dirigido el paquete, si el nombre o el documento anotados coinciden con uno. Lo pone la base; le da aviso y lectura de ese paquete.';

create index if not exists correspondencia_huesped_idx
  on public.correspondencia (huesped_id) where huesped_id is not null;

create or replace function public.huesped_destinatario(
  p_unidad_id uuid,
  p_nombre    text,
  p_documento text
)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select i.usuario_id
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  join public.membresia_unidad mu
    on mu.usuario_id = i.usuario_id and mu.unidad_id = v.unidad_id
  where v.unidad_id = p_unidad_id
    and i.usuario_id is not null
    and mu.rol = 'huesped_temporal'
    and mu.activo
    and (mu.vigente_desde is null or mu.vigente_desde <= current_date)
    and (mu.vigente_hasta is null or mu.vigente_hasta >= current_date)
    and (
      -- El documento, comparando solo los dígitos: «1.098.765» y «1098765».
      (nullif(regexp_replace(coalesce(p_documento, ''), '\D', '', 'g'), '') is not null
       and regexp_replace(coalesce(i.documento_numero, ''), '\D', '', 'g')
           = regexp_replace(p_documento, '\D', '', 'g'))
      -- O el nombre completo, sin mayúsculas ni espacios de más.
      or (nullif(btrim(coalesce(p_nombre, '')), '') is not null
          and lower(regexp_replace(btrim(i.nombre || ' ' || coalesce(i.apellidos, '')), '\s+', ' ', 'g'))
              = lower(regexp_replace(btrim(p_nombre), '\s+', ' ', 'g')))
    )
  order by v.fecha_desde desc nulls last
  limit 1;
$fn$;

comment on function public.huesped_destinatario(uuid, text, text) is
  'El huésped alojado hoy en la vivienda cuyo documento o nombre completo coincide con el destinatario anotado. Interna.';

revoke execute on function public.huesped_destinatario(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.huesped_destinatario(uuid, text, text) to service_role;

create or replace function public.correspondencia_para_el_huesped()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  new.huesped_id := public.huesped_destinatario(
    new.unidad_id, new.destinatario_nombre, new.destinatario_documento);
  return new;
end;
$fn$;

revoke all on function public.correspondencia_para_el_huesped() from public;

drop trigger if exists correspondencia_para_el_huesped on public.correspondencia;
create trigger correspondencia_para_el_huesped
  before insert or update of unidad_id, destinatario_nombre, destinatario_documento, huesped_id
  on public.correspondencia
  for each row execute function public.correspondencia_para_el_huesped();

-- ----------------------------------------------------------------------------
-- Quién lo ve
-- ----------------------------------------------------------------------------
-- El huésped, el suyo y mientras está alojado. Las fotos siguen solas: su
-- política pregunta si el paquete se ve.

drop policy if exists correspondencia_lectura on public.correspondencia;
create policy correspondencia_lectura on public.correspondencia
  for select to authenticated
  using (
    public.es_miembro_unidad(unidad_id)
    or public.es_guardia_de_condominio(public.condominio_de_unidad(unidad_id))
    or public.puede_coadmin(public.condominio_de_unidad(unidad_id), 'visualizarCorrespondencia')
    or (huesped_id = auth.uid() and public.es_huesped_alojado(unidad_id))
  );

create or replace function public.nombres_de_correspondencia(p_ids uuid[])
returns table (correspondencia_id uuid, registrada_por text, recibida_por text)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select
    c.id,
    nullif(btrim(coalesce(pr.nombre, '') || ' ' || coalesce(pr.apellido, '')), ''),
    nullif(btrim(coalesce(pc.nombre, '') || ' ' || coalesce(pc.apellido, '')), '')
  from public.correspondencia c
  left join public.perfil pr on pr.id = c.registrada_por
  left join public.perfil pc on pc.id = c.recibida_por
  where c.id = any(p_ids)
    and (
      public.es_miembro_unidad(c.unidad_id)
      or public.es_guardia_de_condominio(public.condominio_de_unidad(c.unidad_id))
      or public.puede_coadmin(public.condominio_de_unidad(c.unidad_id), 'visualizarCorrespondencia')
      or (c.huesped_id = auth.uid() and public.es_huesped_alojado(c.unidad_id))
    );
$fn$;

-- ----------------------------------------------------------------------------
-- Y le llega el aviso
-- ----------------------------------------------------------------------------

create or replace function public.avisar_al_huesped_del_paquete(
  p_huesped_id uuid,
  p_unidad_id  uuid,
  p_tipo       public.motivo_notificacion,
  p_titulo     text,
  p_mensaje    text,
  p_paquete_id uuid,
  p_excepto    uuid
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $fn$
  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select p_huesped_id, u.condominio_id, p_tipo, p_titulo, p_mensaje,
         'correspondencia', p_paquete_id
  from public.unidad u
  where u.id = p_unidad_id
    and p_huesped_id is not null
    and (p_excepto is null or p_huesped_id <> p_excepto)
    and public.quiere_aviso(p_huesped_id, p_tipo, 'app');
$fn$;

revoke execute on function public.avisar_al_huesped_del_paquete(
  uuid, uuid, public.motivo_notificacion, text, text, uuid, uuid)
  from public, anon, authenticated;

create or replace function public.notificar_correspondencia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_anterior public.estado_correspondencia := null;
  v_texto    text;
begin
  if tg_op = 'UPDATE' then
    v_anterior := old.estado;
  end if;

  if new.estado = 'en_porteria'
     and v_anterior is distinct from 'en_porteria'
     and v_anterior is distinct from 'entregado' then
    v_texto := coalesce(new.empresa, 'Un paquete') || ' llegó a portería.';
    perform public.notificar_unidad(
      new.unidad_id, 'correspondencia_recibida',
      'Correspondencia recibida', v_texto,
      'correspondencia', new.id, new.recibida_por,
      -- El huésped no: la correspondencia de la vivienda es del propietario.
      true);
    -- Salvo la suya (hueco 17).
    perform public.avisar_al_huesped_del_paquete(
      new.huesped_id, new.unidad_id, 'correspondencia_recibida',
      'Te llegó un paquete', v_texto, new.id, new.recibida_por);

  elsif new.estado = 'entregado' and v_anterior is distinct from 'entregado' then
    v_texto := 'Se entregó el envío' || coalesce(' a ' || new.entregada_a, '') || '.';
    perform public.notificar_unidad(
      new.unidad_id, 'correspondencia_entregada',
      'Correspondencia entregada', v_texto,
      'correspondencia', new.id, null,
      true);
    perform public.avisar_al_huesped_del_paquete(
      new.huesped_id, new.unidad_id, 'correspondencia_entregada',
      'Correspondencia entregada', v_texto, new.id, null);
  end if;

  return new;
end;
$function$;

create or replace function public.notificar_incidencia_correspondencia()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_unidad  uuid;
  v_empresa text;
  v_huesped uuid;
  v_texto   text;
begin
  select c.unidad_id, c.empresa, c.huesped_id into v_unidad, v_empresa, v_huesped
  from public.correspondencia c
  where c.id = new.correspondencia_id;

  if v_unidad is null then
    return new;
  end if;

  v_texto := coalesce(v_empresa, 'Un paquete') || ': ' || left(new.descripcion, 140);

  perform public.notificar_unidad(
    v_unidad, 'correspondencia_incidencia',
    'Novedad con tu paquete', v_texto,
    'correspondencia', new.correspondencia_id,
    -- Quien la anotó ya lo sabe.
    new.reportada_por,
    true);
  perform public.avisar_al_huesped_del_paquete(
    v_huesped, v_unidad, 'correspondencia_incidencia',
    'Novedad con tu paquete', v_texto, new.correspondencia_id, new.reportada_por);

  return new;
end;
$fn$;
