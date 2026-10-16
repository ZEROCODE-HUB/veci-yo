-- ----------------------------------------------------------------------------
-- La administración se entera de lo que tiene que aprobar (15/10/2026,
-- hueco 10)
-- ----------------------------------------------------------------------------
-- Una reserva en una zona que requiere aprobación --las de pago-- nacía
-- «pendiente» y nadie se lo decía a la administración: había que entrar a la
-- zona a mirar. Y cuando el vecino mandaba el comprobante, tampoco.
--
-- Ahora le llega el aviso a la administración (administrador y
-- coadministradores con el permiso de zonas) en los dos momentos: al pedirse
-- la reserva y al llegar el comprobante. Mientras siga pendiente: una ya
-- resuelta no tiene nada que aprobar.

create or replace function public.avisar_reserva_por_aprobar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_zona        text;
  v_condominio  uuid;
  v_vivienda    text;
  v_titulo      text;
  v_mensaje     text;
begin
  if new.estado <> 'pendiente' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_titulo := 'Reserva por aprobar';
  elsif new.comprobante_path is not null
        and new.comprobante_path is distinct from old.comprobante_path then
    v_titulo := 'Llegó un comprobante de pago';
  else
    return new;
  end if;

  select z.nombre, z.condominio_id into v_zona, v_condominio
  from public.zona_comun z where z.id = new.zona_id;
  select u.codigo into v_vivienda from public.unidad u where u.id = new.unidad_id;

  v_mensaje := coalesce(v_zona, 'Una zona común')
    || ' · ' || to_char(new.fecha, 'DD/MM/YYYY')
    || ' ' || to_char(new.hora_inicio, 'HH24:MI')
    || coalesce(' · vivienda ' || v_vivienda, '')
    || case when tg_op = 'INSERT' then '. Revisa el comprobante y apruébala o recházala.'
            else '. Ya puedes revisarlo y aprobar la reserva.' end;

  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select distinct mc.usuario_id, v_condominio, 'reserva_por_aprobar'::public.motivo_notificacion,
         v_titulo, v_mensaje, 'reserva_zona', new.id
  from public.membresia_condominio mc
  where mc.condominio_id = v_condominio
    and mc.activo
    and mc.usuario_id is not null
    and mc.usuario_id is distinct from auth.uid()
    and (
      mc.rol = 'administrador'
      -- El coadministrador, si no le quitaron las zonas. Sin la clave cuenta
      -- como permitido, igual que en `puede_coadmin`.
      or (mc.rol = 'coadministrador'
          and coalesce((mc.permisos ->> 'visualizarZonasComunes')::boolean, true))
    )
    and public.quiere_aviso(mc.usuario_id, 'reserva_por_aprobar', 'app');

  return new;
end;
$fn$;

comment on function public.avisar_reserva_por_aprobar() is
  'Avisa a la administración de una reserva pendiente de aprobar, al pedirse y al llegar su comprobante (hueco 10).';

revoke all on function public.avisar_reserva_por_aprobar() from public;

drop trigger if exists reserva_zona_por_aprobar on public.reserva_zona;
create trigger reserva_zona_por_aprobar
  after insert or update of comprobante_path on public.reserva_zona
  for each row execute function public.avisar_reserva_por_aprobar();
