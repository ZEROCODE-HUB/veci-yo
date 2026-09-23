-- ----------------------------------------------------------------------------
-- Disparadores que escuchaban media vida de la fila
-- ----------------------------------------------------------------------------
-- Mismo método que con las casillas decorativas, aplicado a los disparadores:
-- se enumeran los doce que hay, se mira qué eventos escucha cada uno y se
-- contrasta con lo que la aplicación —o cualquiera con la API— puede escribir.
--
-- Ya había salido uno por casualidad: `correspondencia_notificar` escuchaba
-- solo `UPDATE` mientras la app insertaba la fila ya en portería, así que
-- registrar un paquete no avisaba a nadie. La pregunta era si había más.
--
-- Hay tres, y la primera es un agujero de permisos que dejé yo mismo ayer.

-- ----------------------------------------------------------------------------
-- 1. La aprobación de una reserva se saltaba insertando
-- ----------------------------------------------------------------------------
-- `reserva_zona_proteger_resolucion` (20260922204000) impide que quien pide
-- una reserva se la apruebe. Solo escuchaba `UPDATE`: comprobado, un residente
-- inserta la fila directamente con `estado = 'aprobada'` y `resuelta_por` a su
-- nombre, en una zona que requiere aprobación, y entra.
--
-- Cerrar la puerta y dejar la ventana abierta.

create or replace function public.proteger_resolucion_reserva()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_condominio uuid;
  v_anterior public.estado_reserva := null;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_anterior := old.estado;
  end if;

  if new.estado is not distinct from v_anterior then
    return new;
  end if;

  if new.estado not in ('aprobada', 'rechazada') then
    return new;
  end if;

  select z.condominio_id into v_condominio
  from public.zona_comun z where z.id = new.zona_id;

  if not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administracion aprueba o rechaza una reserva';
  end if;

  return new;
end;
$$;

drop trigger if exists reserva_zona_proteger_resolucion on public.reserva_zona;

-- El nombre importa: los disparadores `before` de una misma tabla corren en
-- orden alfabético, y `proteger` va antes que `sin_tramite`. Así la
-- comprobación ve lo que mandó quien llama —`pendiente`— y la aprobación
-- automática, que ocurre después, no se bloquea a sí misma.
create trigger reserva_zona_proteger_resolucion
  before insert or update on public.reserva_zona
  for each row execute function public.proteger_resolucion_reserva();


-- ----------------------------------------------------------------------------
-- 2. Un invitado registrado como ya ingresado no avisaba a la vivienda
-- ----------------------------------------------------------------------------
-- `invitado_notificar_ingreso` escuchaba solo `UPDATE`, que cubre el caso
-- normal —la portería marca la llegada de alguien anunciado—. Pero cuando
-- llega alguien sin anunciar y la portería lo registra ya dentro, la fila nace
-- con `ingreso_en` puesto y la vivienda no se enteraba. Es justo el caso en
-- que más querés enterarte.

create or replace function public.notificar_ingreso_invitado()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unidad uuid;
  v_ingreso_anterior timestamptz := null;
begin
  if tg_op = 'UPDATE' then
    v_ingreso_anterior := old.ingreso_en;
  end if;

  if new.ingreso_en is null or v_ingreso_anterior is not null then
    return new;
  end if;

  select v.unidad_id into v_unidad
  from public.visita v where v.id = new.visita_id;

  -- Las visitas a la administración no tienen unidad a la que avisar.
  if v_unidad is null then
    return new;
  end if;

  perform public.notificar_unidad(
    v_unidad, 'visita_ingreso',
    'Tu visita ingresó',
    new.nombre || ' ingresó al condominio.',
    'visita', new.visita_id, null);
  return new;
end;
$$;

drop trigger if exists invitado_notificar_ingreso on public.invitado;

create trigger invitado_notificar_ingreso
  after insert or update on public.invitado
  for each row execute function public.notificar_ingreso_invitado();


-- ----------------------------------------------------------------------------
-- 3. Una reserva que nace resuelta tampoco avisaba
-- ----------------------------------------------------------------------------
-- `reserva_zona_notificar` escuchaba solo `UPDATE`. Desde 20260923103000 una
-- reserva en zona sin trámite **nace aprobada**, así que ese aviso no llegaba
-- nunca; y una reserva que la administración cree ya resuelta, tampoco.
--
-- A quien la pidió no se le avisa: acaba de hacerla y lo está viendo.

create or replace function public.notificar_reserva()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_zona text;
  v_anterior public.estado_reserva := null;
begin
  if tg_op = 'UPDATE' then
    v_anterior := old.estado;
  end if;

  if new.estado is not distinct from v_anterior then
    return new;
  end if;

  select z.nombre into v_zona
  from public.zona_comun z where z.id = new.zona_id;

  if new.estado = 'aprobada' then
    perform public.notificar_unidad(
      new.unidad_id, 'reserva_aprobada',
      'Reserva confirmada',
      'Tu reserva de ' || coalesce(v_zona, 'la zona comun') ||
        ' para el ' || to_char(new.fecha, 'DD/MM/YYYY') || ' fue aprobada.',
      'reserva_zona', new.id,
      coalesce(new.resuelta_por, new.solicitada_por));

  elsif new.estado = 'rechazada' then
    perform public.notificar_unidad(
      new.unidad_id, 'reserva_rechazada',
      'Reserva rechazada',
      'Tu reserva de ' || coalesce(v_zona, 'la zona comun') ||
        ' para el ' || to_char(new.fecha, 'DD/MM/YYYY') || ' fue rechazada.' ||
        coalesce(' Motivo: ' || new.motivo_rechazo, ''),
      'reserva_zona', new.id, new.resuelta_por);
  end if;
  return new;
end;
$$;

drop trigger if exists reserva_zona_notificar on public.reserva_zona;

create trigger reserva_zona_notificar
  after insert or update on public.reserva_zona
  for each row execute function public.notificar_reserva();
