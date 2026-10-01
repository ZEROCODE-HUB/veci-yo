-- ----------------------------------------------------------------------------
-- El RNT vive donde tiene vigencia
-- ----------------------------------------------------------------------------
-- Defecto introducido hoy, al hacer el reporte TRA. `puede_reportar_tra()`
-- comprueba el RNT en `registro_turismo` --la tabla que lo modela con su
-- numero, su emision y su vencimiento-- pero **nadie escribe ahi**: la
-- pantalla de cumplimiento legal guarda el numero en
-- `suscripcion_renta_corta.rnt`, que es un texto suelto sin fechas.
--
-- O sea: el propietario carga su RNT, y el reporte TRA le dice que la vivienda
-- no tiene RNT. En la prueba no se vio porque la fila de `registro_turismo` se
-- creo a mano.
--
-- La tabla correcta es `registro_turismo`, porque el KT pide que **un RNT
-- vencido bloquee el TRA** y para eso hace falta la fecha. El campo de texto
-- de la suscripcion era el atajo del prototipo.
--
-- Aqui se hacen dos cosas:
--
--   1. `guardar_alojamiento()` escribe el RNT en `registro_turismo`, con su
--      vencimiento cuando la pantalla lo pida.
--   2. `puede_reportar_tra()` acepta tambien el numero suelto de la
--      suscripcion, para los que ya estan cargados. Sin fecha no se puede
--      comprobar la caducidad, y se dice: es mejor un reporte con un RNT que
--      no sabemos si vencio que ninguno, pero no se finge que se comprobo.

-- El vencimiento que la pantalla va a pedir.
alter table public.suscripcion_renta_corta
  add column if not exists rnt_vence_en date;

comment on column public.suscripcion_renta_corta.rnt is
  'El numero, tal como lo teclea el propietario. La fila con vigencia vive en `registro_turismo`, que es lo que mira el reporte TRA.';


-- ----------------------------------------------------------------------------
-- Al guardar el alojamiento, el RNT va a su tabla
-- ----------------------------------------------------------------------------
create or replace function public.sincronizar_rnt()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if nullif(btrim(coalesce(new.rnt, '')), '') is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.rnt is not distinct from old.rnt
     and new.rnt_vence_en is not distinct from old.rnt_vence_en then
    return new;
  end if;

  -- Un RNT por vivienda: si cambia el numero, se actualiza la fila, no se
  -- acumulan. El historial de registros de turismo no es lo que esto modela.
  if exists (select 1 from public.registro_turismo rt
             where rt.unidad_id = new.unidad_id) then
    update public.registro_turismo
       set numero    = btrim(new.rnt),
           vence_en  = new.rnt_vence_en,
           updated_at = now()
     where unidad_id = new.unidad_id;
  else
    insert into public.registro_turismo
      (unidad_id, numero, emitido_en, vence_en, cargado_por)
    values
      (new.unidad_id, btrim(new.rnt), current_date, new.rnt_vence_en, auth.uid());
  end if;

  return new;
end;
$$;

comment on function public.sincronizar_rnt() is
  'El RNT que el propietario teclea en la pantalla acaba en `registro_turismo`, que es donde el reporte TRA lo busca y donde vive su vigencia.';

drop trigger if exists suscripcion_rnt on public.suscripcion_renta_corta;
create trigger suscripcion_rnt
  after insert or update of rnt, rnt_vence_en on public.suscripcion_renta_corta
  for each row execute function public.sincronizar_rnt();


-- ----------------------------------------------------------------------------
-- Y el reporte acepta el numero suelto de los que ya estan cargados
-- ----------------------------------------------------------------------------
create or replace function public.puede_reportar_tra()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inv     record;
  v_unidad  uuid;
  v_rnt     text;
  v_vence   date;
begin
  select i.llego, i.ingreso_en, i.salida_en, v.unidad_id
    into v_inv
  from public.invitado i
  join public.visita v on v.id = i.visita_id
  where i.id = new.invitado_id;

  if not found then
    raise exception 'Ese huesped no existe';
  end if;

  v_unidad := v_inv.unidad_id;

  -- "Nunca antes": un reporte de entrada sin ingreso confirmado por Seguridad
  -- es un dato falso enviado a una autoridad.
  if new.movimiento = 'entrada' and not coalesce(v_inv.llego, false) then
    raise exception 'El reporte de entrada necesita que la porteria haya confirmado el ingreso'
      using errcode = 'check_violation';
  end if;

  if new.movimiento = 'salida' and v_inv.salida_en is null then
    raise exception 'El reporte de salida necesita que la salida este registrada'
      using errcode = 'check_violation';
  end if;

  -- El registro con vigencia manda.
  select rt.numero, rt.vence_en into v_rnt, v_vence
  from public.registro_turismo rt
  where rt.unidad_id = v_unidad
  order by rt.emitido_en desc nulls last
  limit 1;

  -- Y si no lo hay, el numero suelto que la suscripcion guarda. Sin fecha no
  -- se puede comprobar la caducidad: se reporta, pero no se finge que se
  -- comprobo algo que no se sabe.
  if v_rnt is null then
    select s.rnt into v_rnt
    from public.suscripcion_renta_corta s
    where s.unidad_id = v_unidad
      and nullif(btrim(coalesce(s.rnt, '')), '') is not null;
  end if;

  if v_rnt is null then
    raise exception 'Esta vivienda no tiene RNT cargado, y sin RNT no se puede referenciar el reporte'
      using errcode = 'check_violation';
  end if;

  if v_vence is not null and v_vence < current_date then
    raise exception 'El RNT de esta vivienda esta vencido'
      using errcode = 'check_violation';
  end if;

  new.rnt := v_rnt;
  new.reportado_por := coalesce(new.reportado_por, auth.uid());

  return new;
end;
$$;
