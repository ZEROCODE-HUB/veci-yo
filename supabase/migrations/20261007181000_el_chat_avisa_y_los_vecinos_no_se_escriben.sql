-- El chat avisa, y entre vecinos no se escribe
--
-- Dos cosas que pidió el cliente el 07/10/2026, en la misma frase:
--
--   «el chat obvio que debe generar notificación, y obvio debe poderse editar
--    en configuraciones si se quiere recibir o no... ojo, no debe poderse
--    escribir entre vecinos, solo los canales de Chat, y solo poder
--    comunicarse con administración y guardias»
--
-- ============================================================================
-- 1. Entre vecinos no se escribe
-- ============================================================================
-- La pantalla **ya lo cumplía**: «Nuevo chat» solo ofrece portería y
-- administración a un residente, y una vivienda al personal. Nunca ofreció
-- escribirle a un vecino.
--
-- Y la base lo permitía:
--
--     (tipo = 'directa' and es_miembro_condominio(condominio_id))
--
-- O sea cualquiera del edificio contra cualquiera, por PostgREST, sin pasar
-- por ninguna pantalla. Es el defecto más repetido de este proyecto --la
-- decisión vivía en la pantalla, no en el dato-- y aquí con un agravante: el
-- producto lo prohíbe explícitamente, así que no es un permiso de más, es una
-- regla incumplida.
--
-- **No se tocan los datos.** No hay ni una conversación `directa` en la base
-- --comprobado antes de escribir esto-- así que no queda nada huérfano, y el
-- valor del enum se queda: `puede_ver_conversacion_fila` lo sigue entendiendo,
-- y borrar un valor de un enum no es aditivo.

drop policy if exists conversacion_alta on public.conversacion;

create policy conversacion_alta on public.conversacion
  for insert to authenticated
  with check (
    creada_por = auth.uid()
    and (
      (
        tipo = 'area'
        and (
          public.es_residente_o_huesped(unidad_id)
          or (area = 'seguridad' and public.es_guardia_de_condominio(condominio_id))
          or (area = 'administracion' and public.puede_coadmin(condominio_id, 'contestarChat'))
        )
      )
      or (tipo = 'grupo' and public.puede_coadmin(condominio_id, 'contestarChat'))
    )
  );

comment on policy conversacion_alta on public.conversacion is
  'Un hilo con la porteria o con la administracion, o un canal del edificio. '
  '**Una conversacion `directa` no se puede crear**: el producto no permite '
  'que dos vecinos se escriban entre si, y hasta el 07/10/2026 esto lo '
  'sujetaba solo la pantalla.';

-- ============================================================================
-- 2. El chat avisa
-- ============================================================================
-- Hace falta saber **quién está en una conversación**, y eso no existía: la
-- pertenencia se deduce del rol, no se guarda. `participante_conversacion`
-- solo tiene fila de quien la abrió alguna vez, para la marca de leído.
--
-- Así que hay dos preguntas distintas con la misma respuesta hasta hoy:
-- «¿puede ver esto?» --que es un booleano sobre `auth.uid()`, y ya existía--
-- y «¿a quién hay que avisar?», que es un conjunto. Esta es la segunda.

create or replace function public.quien_esta_en_la_conversacion(
  p_conversacion_id uuid
)
returns table (usuario_id uuid)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with c as (
    select * from public.conversacion where id = p_conversacion_id
  )
  -- Un hilo de area: la vivienda, y el personal del area que lo atiende.
  select m.usuario_id
  from c
  join public.membresia_unidad m on m.unidad_id = c.unidad_id and m.activo
  where c.tipo = 'area'
    -- El huesped, mientras dure su estancia. La membresia sigue activa
    -- despues, que es lo que distingue a Ramiro de Tomas en las pruebas.
    and (
      m.rol <> 'huesped_temporal'
      or (
        (m.vigente_desde is null or m.vigente_desde <= current_date)
        and (m.vigente_hasta is null or m.vigente_hasta >= current_date)
      )
    )

  union

  select mc.usuario_id
  from c
  join public.membresia_condominio mc
    on mc.condominio_id = c.condominio_id and mc.activo
  where c.tipo = 'area'
    and (
      (c.area = 'seguridad' and mc.rol = 'guardia')
      -- D-13: la porteria no, en el hilo de administracion. Y al reves
      -- tampoco: cada area atiende el suyo.
      or (c.area = 'administracion' and mc.rol in ('administrador', 'coadministrador'))
    )

  union

  -- Un canal: quien tenga alguno de los roles que lo componen. Es
  -- `es_del_canal` del derecho, como conjunto en vez de como pregunta.
  select m.usuario_id
  from c
  join public.canal_rol cr on cr.conversacion_id = c.id and cr.rol_unidad is not null
  join public.unidad u on u.condominio_id = c.condominio_id and u.deleted_at is null
  join public.membresia_unidad m
    on m.unidad_id = u.id and m.rol = cr.rol_unidad and m.activo
  where c.tipo = 'grupo'

  union

  select mc.usuario_id
  from c
  join public.canal_rol cr on cr.conversacion_id = c.id and cr.rol_condominio is not null
  join public.membresia_condominio mc
    on mc.condominio_id = c.condominio_id and mc.rol = cr.rol_condominio and mc.activo
  where c.tipo = 'grupo';
$$;

comment on function public.quien_esta_en_la_conversacion(uuid) is
  'Quien pertenece a una conversacion, como conjunto. `puede_ver_conversacion` '
  'responde lo mismo para una sola persona; esta hace falta para avisar, que '
  'es la pregunta al reves.';

revoke all on function public.quien_esta_en_la_conversacion(uuid) from public, anon;
grant execute on function public.quien_esta_en_la_conversacion(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- Y el aviso
-- ----------------------------------------------------------------------------

create or replace function public.avisar_del_mensaje()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_conv record;
  v_titulo text;
begin
  select c.id, c.condominio_id, c.tipo, c.area, c.nombre, c.unidad_id
    into v_conv
  from public.conversacion c
  where c.id = new.conversacion_id;

  if v_conv.id is null then
    return new;
  end if;

  /*
    El titulo dice **de donde viene**, no quien escribio: en un canal de cien
    viviendas el nombre de quien escribe no situa nada, y en un hilo con la
    porteria responde quien este de turno --no una persona--, que es
    exactamente lo que dice la pantalla al abrirlo.
  */
  v_titulo := coalesce(
    nullif(v_conv.nombre, ''),
    case v_conv.area
      when 'seguridad' then 'Portería'
      when 'administracion' then 'Administración'
      else 'Mensaje nuevo'
    end
  );

  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select q.usuario_id, v_conv.condominio_id, 'mensaje_de_chat',
         v_titulo, left(new.texto, 140), 'conversacion', v_conv.id
  from public.quien_esta_en_la_conversacion(v_conv.id) q
  where
    -- A quien escribio, no.
    q.usuario_id <> new.autor_id
    /*
      A quien silencio **esta** conversacion, tampoco. Silenciar ya apagaba el
      contador de no leidos, y seria absurdo que empezara a sonar justo al
      conectar los avisos: el interruptor que el cliente pidio el 02/10 habria
      dejado de hacer lo que promete el mismo dia que esto se enciende.
    */
    and not exists (
      select 1 from public.participante_conversacion p
      where p.conversacion_id = v_conv.id
        and p.usuario_id = q.usuario_id
        and p.silenciado
    )
    -- Y a quien apago este motivo. Sin esto la casilla seria decorativa.
    and public.quiere_aviso(q.usuario_id, 'mensaje_de_chat', 'app');

  return new;
end;
$$;

comment on function public.avisar_del_mensaje() is
  'Avisa a quien esta en la conversacion, menos a quien escribio, a quien la '
  'silencio y a quien apago el motivo.';

drop trigger if exists mensaje_avisa on public.mensaje;

create trigger mensaje_avisa
  after insert on public.mensaje
  for each row
  execute function public.avisar_del_mensaje();

comment on trigger mensaje_avisa on public.mensaje is
  'Hasta el 07/10/2026 un mensaje de chat no generaba notificacion: lo unico '
  'que avisaba era el contador de no leidos.';
