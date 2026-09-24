-- ----------------------------------------------------------------------------
-- El reporte TRA/SIRE
-- ----------------------------------------------------------------------------
-- El timeline de seis pasos que el KT da por hecho --"🔗 preregistro enviado →
-- 📄 documentacion completa → 📝 T&C aceptados → 🛡️ verificacion pasada →
-- 🟢 TRA/SIRE entrada → 🔴 TRA/SIRE salida", `[DECIDIDO, en codigo]`-- esta
-- **muerto**: `mapearInvitado()` no devuelve `timeline`, asi que
-- `TimelineReservaHuespedes` recibe `undefined` y pinta los seis pasos en
-- pendiente para todo el mundo, siempre.
--
-- Cuatro de los seis ya se podian saber con lo que hay en la base. Los dos
-- ultimos no tenian donde vivir: `registro_turismo` **no es** esto --es el RNT
-- del alojamiento, el numero que el propietario carga con su vigencia--, y el
-- TRA es un reporte **por huesped y por movimiento**.
--
-- Reglas del KT que la base impone aqui, porque son las que no se pueden
-- dejar a la pantalla:
--
--   * "Solo cuando Seguridad confirma el ingreso fisico del huesped se habilita
--     al Anfitrion el boton para hacer el reporte TRA/SIRE (nunca antes, nunca
--     automatico)" `[DECIDIDO]`. Un reporte de entrada sin ingreso confirmado
--     es un dato falso enviado a una autoridad.
--   * "RNT vencido o inexistente → bloquea la posibilidad de TRA (sin RNT no se
--     puede referenciar el reporte)" `[DECIDIDO]`.
--   * Es **opcional y huesped por huesped**, no automatico: por eso no hay
--     disparador que lo cree solo al confirmar la llegada.
--
-- Lo que **no** se hace: enviar nada a ninguna autoridad. No hay integracion
-- con TRA ni con SIRE, y fingir que el reporte salio seria peor que no
-- tenerlo. Se registra que el anfitrion lo hizo, con su numero de radicado
-- cuando lo tenga.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'movimiento_tra') then
    create type public.movimiento_tra as enum ('entrada', 'salida');
  end if;
end $$;

create table if not exists public.reporte_tra (
  id            uuid primary key default gen_random_uuid(),
  invitado_id   uuid not null references public.invitado(id) on delete cascade,
  movimiento    public.movimiento_tra not null,
  -- El RNT que se referencia. Se copia al reportar y no se recalcula: si el
  -- alojamiento cambia de numero, lo ya reportado se hizo con el de entonces.
  rnt           text not null,
  -- Lo que devuelve la autoridad cuando haya integracion. Vacio mientras el
  -- reporte se registre a mano, que es hoy.
  radicado      text,
  observaciones text,
  reportado_por uuid references auth.users(id) on delete set null,
  reportado_en  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Un movimiento se reporta una vez. Dos entradas del mismo huesped serian dos
-- registros distintos ante la autoridad para el mismo hecho.
create unique index if not exists reporte_tra_unico
  on public.reporte_tra (invitado_id, movimiento);

comment on table public.reporte_tra is
  'El reporte de entrada o salida de un huesped ante la autoridad de turismo. No lo envia nadie todavia: se registra que el anfitrion lo hizo.';
comment on column public.reporte_tra.radicado is
  'El numero que devuelve la autoridad. Vacio mientras no haya integracion con TRA/SIRE, que es hoy: fingir que el reporte salio seria peor que no tenerlo.';

drop trigger if exists reporte_tra_tocar_updated_at on public.reporte_tra;
create trigger reporte_tra_tocar_updated_at
  before update on public.reporte_tra
  for each row execute function public.tocar_updated_at();


-- ----------------------------------------------------------------------------
-- Cuando se puede reportar
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

  -- Sin RNT no hay nada que referenciar. Se busca el vigente del alojamiento.
  select rt.numero, rt.vence_en into v_rnt, v_vence
  from public.registro_turismo rt
  where rt.unidad_id = v_unidad
  order by rt.emitido_en desc nulls last
  limit 1;

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

drop trigger if exists reporte_tra_comprobar on public.reporte_tra;
create trigger reporte_tra_comprobar
  before insert on public.reporte_tra
  for each row execute function public.puede_reportar_tra();


-- ----------------------------------------------------------------------------
-- Quien lo hace y quien lo ve
-- ----------------------------------------------------------------------------
-- El anfitrion, que es quien responde por el cumplimiento legal del
-- alojamiento. **El huesped no**: el KT es explicito en que "el huesped nunca
-- ve las palabras TRA/SIRE/verificacion en su UI", y darle la fila seria
-- dejarle verlas por la API aunque la pantalla se las esconda.
create or replace function public.es_anfitrion_del_invitado(p_invitado_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.invitado i
    join public.visita v on v.id = i.visita_id
    join public.membresia_unidad mu on mu.unidad_id = v.unidad_id
    where i.id = p_invitado_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      and mu.rol in ('propietario', 'inquilino_lider')
  );
$$;

comment on function public.es_anfitrion_del_invitado(uuid) is
  'Quien responde por el cumplimiento legal del alojamiento. El huesped no entra: el KT dice que nunca ve las palabras TRA/SIRE.';

revoke all on function public.es_anfitrion_del_invitado(uuid) from public;
grant execute on function public.es_anfitrion_del_invitado(uuid) to authenticated;

alter table public.reporte_tra enable row level security;

drop policy if exists reporte_tra_lectura on public.reporte_tra;
create policy reporte_tra_lectura on public.reporte_tra
  for select to authenticated
  using (public.es_anfitrion_del_invitado(invitado_id));

drop policy if exists reporte_tra_alta on public.reporte_tra;
create policy reporte_tra_alta on public.reporte_tra
  for insert to authenticated
  with check (public.es_anfitrion_del_invitado(invitado_id));

-- Se puede completar con el radicado cuando la autoridad lo devuelva, pero no
-- se borra: es un hecho declarado ante un tercero.
drop policy if exists reporte_tra_cambio on public.reporte_tra;
create policy reporte_tra_cambio on public.reporte_tra
  for update to authenticated
  using (public.es_anfitrion_del_invitado(invitado_id))
  with check (public.es_anfitrion_del_invitado(invitado_id));

grant select, insert, update on public.reporte_tra to authenticated;
