-- ----------------------------------------------------------------------------
-- Las PQRS avisan, y el anfitrión ve las de su huésped (15/10/2026, hueco 14)
-- ----------------------------------------------------------------------------
-- Tres cosas que faltaban:
--
-- 1. La administración no se enteraba de una PQRS nueva: había que entrar a
--    mirar. Ahora le llega el aviso (administrador y coadministradores).
-- 2. Quien la creaba no se enteraba de la respuesta. Ahora, cuando cambia el
--    estado o se escribe la resolución, le llega el aviso.
-- 3. El anfitrión no veía las PQRS de su huésped. Y había algo peor: el
--    formulario deja elegir «Propietario» como destinatario, y el propietario
--    **no podía leerla** --la lectura solo miraba a quien la creó y a la
--    administración--. Era una casilla decorativa: la queja se mandaba a
--    alguien que nunca la iba a ver.
--
--    Ahora el anfitrión de la vivienda (propietario o inquilino líder) ve las
--    PQRS de esa vivienda dirigidas a «Propietario», y todas las que crea un
--    huésped de su vivienda. Le llega el aviso de las dos.
--
-- Las del área «Aplicación» siguen siendo solo de la plataforma: ni la
-- administración ni el anfitrión las ven, ni reciben su aviso.

-- ----------------------------------------------------------------------------
-- Quién es el anfitrión, sobre las columnas
-- ----------------------------------------------------------------------------
-- Sobre las columnas y no releyendo la fila: una política de SELECT no ve, en
-- el RETURNING de un INSERT, la fila que el mismo INSERT escribe.

create or replace function public.es_anfitrion_de_la_pqrs(
  p_unidad_id    uuid,
  p_creado_por   uuid,
  p_destinatario public.destinatario_reclamo,
  p_area         public.area_reclamo
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select p_unidad_id is not null
    and p_area <> 'aplicacion'
    and exists (
      select 1 from public.membresia_unidad m
      where m.unidad_id = p_unidad_id
        and m.usuario_id = auth.uid()
        and m.activo
        and m.rol in ('propietario', 'inquilino_lider')
    )
    and (
      p_destinatario = 'propietario'
      or exists (
        select 1 from public.membresia_unidad h
        where h.unidad_id = p_unidad_id
          and h.usuario_id = p_creado_por
          and h.rol = 'huesped_temporal'
      )
    );
$fn$;

comment on function public.es_anfitrion_de_la_pqrs(uuid, uuid, public.destinatario_reclamo, public.area_reclamo) is
  'Si quien pregunta es el anfitrión de la vivienda de la PQRS y le toca verla: va dirigida a «Propietario» o la creó un huésped de esa vivienda. Nunca las del área Aplicación.';

revoke all on function public.es_anfitrion_de_la_pqrs(uuid, uuid, public.destinatario_reclamo, public.area_reclamo) from public;
grant execute on function public.es_anfitrion_de_la_pqrs(uuid, uuid, public.destinatario_reclamo, public.area_reclamo) to authenticated;

drop policy if exists reclamo_lectura on public.reclamo;
create policy reclamo_lectura on public.reclamo
  for select to authenticated
  using (
    creado_por = auth.uid()
    or (area <> 'aplicacion' and public.es_admin_condominio(condominio_id))
    or (area = 'aplicacion' and public.es_staff_plataforma())
    or public.es_anfitrion_de_la_pqrs(unidad_id, creado_por, destinatario, area)
  );

-- Los adjuntos siguen a la PQRS.
create or replace function public.puede_ver_reclamo(p_reclamo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1 from public.reclamo r
    where r.id = p_reclamo_id
      and (
        r.creado_por = auth.uid()
        or (r.area <> 'aplicacion' and public.es_admin_condominio(r.condominio_id))
        or (r.area =  'aplicacion' and public.es_staff_plataforma())
        or public.es_anfitrion_de_la_pqrs(r.unidad_id, r.creado_por, r.destinatario, r.area)
      )
  );
$function$;

-- ----------------------------------------------------------------------------
-- Los avisos
-- ----------------------------------------------------------------------------

create or replace function public.notificar_reclamo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_quien  uuid := auth.uid();
  v_titulo text := coalesce(new.numero || ' · ', '') || new.titulo;
begin
  if tg_op = 'INSERT' then
    if new.area = 'aplicacion' then
      return new;
    end if;

    -- La administración.
    insert into public.notificacion
      (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
    select distinct mc.usuario_id, new.condominio_id, 'reclamo_nuevo'::public.motivo_notificacion,
           'Nueva PQRS', v_titulo, 'reclamo', new.id
    from public.membresia_condominio mc
    where mc.condominio_id = new.condominio_id
      and mc.rol in ('administrador', 'coadministrador')
      and mc.activo
      and mc.usuario_id is not null
      and mc.usuario_id is distinct from new.creado_por
      and public.quiere_aviso(mc.usuario_id, 'reclamo_nuevo', 'app');

    -- El anfitrión, si le toca (la misma condición que su lectura).
    if new.unidad_id is not null and (
         new.destinatario = 'propietario'
         or exists (select 1 from public.membresia_unidad h
                    where h.unidad_id = new.unidad_id
                      and h.usuario_id = new.creado_por
                      and h.rol = 'huesped_temporal')) then
      insert into public.notificacion
        (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
      select distinct m.usuario_id, new.condominio_id, 'reclamo_nuevo'::public.motivo_notificacion,
             'Nueva PQRS de tu vivienda', v_titulo, 'reclamo', new.id
      from public.membresia_unidad m
      where m.unidad_id = new.unidad_id
        and m.activo
        and m.usuario_id is not null
        and m.rol in ('propietario', 'inquilino_lider')
        and m.usuario_id is distinct from new.creado_por
        and public.quiere_aviso(m.usuario_id, 'reclamo_nuevo', 'app')
        -- Quien ya recibió el de la administración no recibe dos.
        and not exists (select 1 from public.notificacion n
                        where n.usuario_id = m.usuario_id and n.entidad_id = new.id);
    end if;

  elsif (new.estado, new.resolucion) is distinct from (old.estado, old.resolucion)
        and new.creado_por is not null
        and new.creado_por is distinct from v_quien then
    insert into public.notificacion
      (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
    select new.creado_por, new.condominio_id, 'reclamo_respondido'::public.motivo_notificacion,
           case new.estado
             when 'resuelto' then 'Tu PQRS se resolvió'
             when 'en_curso' then 'Tu PQRS está en curso'
             else 'Tu PQRS tiene novedades'
           end,
           coalesce(left(new.resolucion, 140), v_titulo),
           'reclamo', new.id
    where public.quiere_aviso(new.creado_por, 'reclamo_respondido', 'app');
  end if;

  return new;
end;
$fn$;

comment on function public.notificar_reclamo() is
  'Avisa de una PQRS nueva a la administración y, si le toca, al anfitrión; y de su respuesta a quien la creó (hueco 14). Las del área Aplicación no avisan a nadie del edificio.';

revoke all on function public.notificar_reclamo() from public;

drop trigger if exists reclamo_notificar on public.reclamo;
create trigger reclamo_notificar
  after insert or update of estado, resolucion on public.reclamo
  for each row execute function public.notificar_reclamo();
