-- ----------------------------------------------------------------------------
-- Correspondencia: avisar a quien toca, y dejar constancia de quién la recibió
-- ----------------------------------------------------------------------------
-- Tres defectos encontrados al cubrir el dominio, los tres comprobados contra
-- la base con sesiones reales.
--
-- **1. Registrar un paquete no avisaba a nadie.** El disparador de
-- notificación escuchaba solo `AFTER UPDATE`, pero la aplicación **inserta**
-- la fila ya con `estado = 'en_porteria'` (`correspondencia.repo.ts`). Es
-- decir: el camino normal —la portería recibe un paquete y lo registra— no
-- producía ninguna notificación. Avisar de que llegó un paquete es el motivo
-- por el que existe este módulo.
--
-- **2. No quedaba constancia de quién lo recibió.** `recibida_en` y
-- `recibida_por` solo se rellenaban en el camino del `update`, así que un
-- paquete registrado directamente no decía quién lo había recibido ni cuándo.
-- La regla 2 de `AGENTS.md` lo nombra explícitamente: en correspondencia eso
-- no es opcional.
--
-- **3. Se avisaba a los huéspedes de la correspondencia del propietario.**
-- `notificar_unidad` avisa a todos los miembros activos de la vivienda, y el
-- huésped temporal es uno. En la 102 eso eran cinco huéspedes —incluido uno
-- cuya estancia terminó en agosto y otra que todavía no había llegado—
-- recibiendo "llegó un paquete de tal empresa" sobre correspondencia que RLS
-- no les deja abrir. El nombre de la empresa viajaba en el mensaje.
--
-- Se arregla en la base y no en el cliente: así vale para cualquier cosa que
-- escriba en la tabla, hoy o mañana.


-- ----------------------------------------------------------------------------
-- A quién avisa `notificar_unidad`
-- ----------------------------------------------------------------------------
-- El huésped no se excluye siempre: cuando llega SU visita o le aprueban SU
-- reserva, quiere enterarse. Se excluye cuando el aviso es de algo de la
-- vivienda que no le corresponde, y eso lo decide quien llama.
--
-- `create or replace` con un parámetro nuevo crearía una SOBRECARGA y las
-- llamadas existentes quedarían ambiguas, así que primero se elimina la firma
-- anterior. Los tres disparadores que la llaman pasan siete argumentos o
-- menos, así que siguen resolviendo contra la nueva.
drop function if exists public.notificar_unidad(
  uuid, public.motivo_notificacion, text, text, text, uuid, uuid
);

create or replace function public.notificar_unidad(
  p_unidad_id      uuid,
  p_tipo           public.motivo_notificacion,
  p_titulo         text,
  p_mensaje        text,
  p_entidad_tipo   text DEFAULT NULL,
  p_entidad_id     uuid DEFAULT NULL,
  p_excepto        uuid DEFAULT NULL,
  p_solo_residentes boolean DEFAULT false
)
returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select distinct m.usuario_id, u.condominio_id, p_tipo, p_titulo, p_mensaje,
         p_entidad_tipo, p_entidad_id
  from public.membresia_unidad m
  join public.unidad u on u.id = m.unidad_id
  where m.unidad_id = p_unidad_id
    and m.activo
    and m.puede_acceder
    and m.usuario_id is not null
    and (p_excepto is null or m.usuario_id <> p_excepto)
    and (not p_solo_residentes or m.rol <> 'huesped_temporal');
$$;

comment on function public.notificar_unidad(uuid, public.motivo_notificacion, text, text, text, uuid, uuid, boolean) is
  'Avisa a los miembros de la vivienda. Con p_solo_residentes deja fuera al huesped temporal, para lo que es del hogar y no de su estancia.';


-- ----------------------------------------------------------------------------
-- Quién recibió el paquete y cuándo
-- ----------------------------------------------------------------------------

create or replace function public.sellar_correspondencia()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_anterior public.estado_correspondencia := null;
begin
  -- En un INSERT no existe `old`: leerlo sin comprobar el tipo de operación
  -- aborta la sentencia.
  if tg_op = 'UPDATE' then
    v_anterior := old.estado;
  end if;

  if new.estado = 'en_porteria' and v_anterior is distinct from 'en_porteria' then
    new.recibida_en  := coalesce(new.recibida_en, now());
    new.recibida_por := coalesce(new.recibida_por, auth.uid());
  end if;

  if new.estado = 'entregado' and v_anterior is distinct from 'entregado' then
    new.entregada_en := coalesce(new.entregada_en, now());
  end if;

  return new;
end;
$$;

drop trigger if exists correspondencia_sellar on public.correspondencia;

create trigger correspondencia_sellar
  before insert or update on public.correspondencia
  for each row execute function public.sellar_correspondencia();


-- ----------------------------------------------------------------------------
-- El aviso
-- ----------------------------------------------------------------------------

create or replace function public.notificar_correspondencia()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_anterior public.estado_correspondencia := null;
begin
  if tg_op = 'UPDATE' then
    v_anterior := old.estado;
  end if;

  if new.estado = 'en_porteria' and v_anterior is distinct from 'en_porteria' then
    perform public.notificar_unidad(
      new.unidad_id, 'correspondencia_recibida',
      'Correspondencia recibida',
      coalesce(new.empresa, 'Un paquete') || ' llegó a portería.',
      'correspondencia', new.id, new.recibida_por,
      -- El huésped no: no puede abrir la correspondencia del propietario y el
      -- mensaje lleva el nombre de la empresa.
      true);

  elsif new.estado = 'entregado' and v_anterior is distinct from 'entregado' then
    perform public.notificar_unidad(
      new.unidad_id, 'correspondencia_entregada',
      'Correspondencia entregada',
      'Se entregó el envío' ||
        coalesce(' a ' || new.entregada_a, '') || '.',
      'correspondencia', new.id, null,
      true);
  end if;

  return new;
end;
$$;

drop trigger if exists correspondencia_notificar on public.correspondencia;

create trigger correspondencia_notificar
  after insert or update on public.correspondencia
  for each row execute function public.notificar_correspondencia();

comment on function public.notificar_correspondencia() is
  'Avisa al registrar el paquete y al entregarlo. Escucha tambien el INSERT: la app inserta la fila ya en porteria, asi que con solo UPDATE el aviso no llegaba nunca.';
