-- Directorio (pedido del cliente, 16/11/2026): «poder seleccionar
-- masivamente, y poder enviar un mensaje» y «profesional permanente debe
-- igual mostrarse en el directorio de Viviendas, o sea sus datos».
--
-- Dos funciones nuevas, solo aditivas:
--
--   1. `mensaje_a_viviendas`: la administración escribe un mismo mensaje a
--      varias viviendas. Se decidió que llegue **por el chat** de cada una con
--      la administración, con su aviso push: por eso escribe en la
--      conversación de área `administracion` de cada vivienda --la misma que
--      abre «Chat» en el directorio (`abrirConversacionArea`)-- y la crea si no
--      existe. El aviso lo manda el disparador que ya existe sobre `mensaje`
--      (`avisar_del_mensaje`): no hay un segundo camino de avisos.
--   2. `personal_permanente_de_la_vivienda`: quién trabaja de forma
--      permanente en una vivienda (las visitas `permanente` vigentes), con su
--      oficio, días, documento y teléfono.

-- 1. Un mensaje a varias viviendas, por el chat de cada una con la
--    administración.
create or replace function public.mensaje_a_viviendas(p_unidades uuid[], p_texto text)
 returns table (unidad_id uuid, codigo text, enviado boolean, motivo text, conversacion_id uuid)
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $$
declare
  v_yo uuid := auth.uid();
  v_texto text := btrim(coalesce(p_texto, ''));
  v_nombre text;
  v_id uuid;
  v_unidad record;
  v_conversacion uuid;
begin
  if v_yo is null then
    raise exception 'Hay que entrar con una cuenta para enviar mensajes';
  end if;
  if v_texto = '' then
    raise exception 'Escribe el mensaje antes de enviarlo';
  end if;
  if p_unidades is null or cardinality(p_unidades) = 0 then
    raise exception 'Elige al menos un departamento';
  end if;

  -- El personal firma con su nombre (20261026224000), igual que desde la app.
  select coalesce(nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''), 'Administración')
    into v_nombre
  from public.perfil p where p.id = v_yo;
  v_nombre := coalesce(v_nombre, 'Administración');

  for v_id in select distinct x from unnest(p_unidades) as x loop
    select u.id, u.codigo, u.condominio_id into v_unidad
    from public.unidad u
    where u.id = v_id and u.deleted_at is null;

    /*
      Una vivienda que no existe y una de otro edificio responden lo mismo: si
      la respuesta las distinguiera, cualquiera podría preguntar qué viviendas
      existen en edificios ajenos. Y el permiso se mira **por vivienda**, no una
      vez para todas: la lista puede mezclar edificios.
    */
    if v_unidad.id is null or not public.es_admin_condominio(v_unidad.condominio_id) then
      unidad_id := v_id; codigo := null; enviado := false;
      motivo := 'Solo la administración de su edificio puede escribirle';
      conversacion_id := null;
      return next;
      continue;
    end if;

    begin
      select c.id into v_conversacion
      from public.conversacion c
      where c.tipo = 'area' and c.area = 'administracion' and c.unidad_id = v_unidad.id;

      if v_conversacion is null then
        -- Como `abrirConversacionArea`: la conversación de área no lleva
        -- participantes; quién está lo dice su rol (`quien_esta_en_la_conversacion`).
        insert into public.conversacion (condominio_id, tipo, area, unidad_id, creada_por)
        values (v_unidad.condominio_id, 'area', 'administracion', v_unidad.id, v_yo)
        on conflict do nothing;

        select c.id into v_conversacion
        from public.conversacion c
        where c.tipo = 'area' and c.area = 'administracion' and c.unidad_id = v_unidad.id;
      end if;

      insert into public.mensaje (conversacion_id, autor_id, autor_nombre, texto)
      values (v_conversacion, v_yo, v_nombre, v_texto);

      unidad_id := v_unidad.id; codigo := v_unidad.codigo; enviado := true;
      motivo := null; conversacion_id := v_conversacion;
      return next;
    exception when others then
      -- Una vivienda que falla no tumba a las demás: se dice cuál y por qué.
      unidad_id := v_unidad.id; codigo := v_unidad.codigo; enviado := false;
      motivo := sqlerrm; conversacion_id := null;
      return next;
    end;
    v_conversacion := null;
  end loop;
end;
$$;

comment on function public.mensaje_a_viviendas(uuid[], text) is
  'Directorio (16/11/2026): la administración escribe un mismo mensaje en el chat administración-vivienda de cada departamento elegido (lo crea si falta). El aviso push lo da avisar_del_mensaje. Devuelve una fila por vivienda con si se envió y, si no, por qué.';

revoke execute on function public.mensaje_a_viviendas(uuid[], text) from public, anon, authenticated;
grant execute on function public.mensaje_a_viviendas(uuid[], text) to authenticated, service_role;

-- 2. El personal permanente de una vivienda.
create or replace function public.personal_permanente_de_la_vivienda(p_unidad_id uuid)
 returns table (
   visita_id uuid,
   nombre text,
   profesion text,
   dias_trabajo smallint[],
   tipo_documento text,
   documento_numero text,
   codigo_pais text,
   telefono text
 )
 language plpgsql
 stable
 security definer
 set search_path to 'public', 'pg_temp'
as $$
declare
  v_condominio uuid;
begin
  select u.condominio_id into v_condominio
  from public.unidad u
  where u.id = p_unidad_id and u.deleted_at is null;

  /*
    Quien trabaja en el edificio (administración y portería, que ya ven las
    visitas) y quien es de **esa** vivienda. El huésped temporal no:
    `es_miembro_unidad` lo deja fuera a propósito, y el documento de quien
    limpia la casa no es cosa de quien pasa unas noches.
  */
  if v_condominio is null
     or not (public.es_admin_condominio(v_condominio)
             or public.es_personal_condominio(v_condominio)
             or public.es_miembro_unidad(p_unidad_id)) then
    raise exception 'Solo la administración, la portería y quienes viven ahí ven el personal de una vivienda';
  end if;

  return query
  select
    v.id,
    btrim(i.nombre || ' ' || coalesce(i.apellidos, '')),
    nullif(btrim(v.profesion), ''),
    v.dias_trabajo,
    i.tipo_documento::text,
    nullif(btrim(i.documento_numero), ''),
    i.codigo_pais,
    nullif(btrim(i.telefono), '')
  from public.visita v
  join public.invitado i on i.visita_id = v.id
  where v.unidad_id = p_unidad_id
    and v.tipo = 'permanente'
    and v.deleted_at is null
    -- Vigente: ni terminada ni cancelada, y sin una fecha final ya pasada.
    and v.estado in ('programada', 'ingresada')
    and (v.fecha_hasta is null or v.fecha_hasta >= public.hoy_en_la_unidad(p_unidad_id))
  order by i.nombre, i.orden;
end;
$$;

comment on function public.personal_permanente_de_la_vivienda(uuid) is
  'Directorio (16/11/2026): el personal permanente vigente de una vivienda (nombre, oficio, días, documento y teléfono). Solo responde a la administración y la portería del edificio y a los miembros de esa vivienda.';

revoke execute on function public.personal_permanente_de_la_vivienda(uuid) from public, anon, authenticated;
grant execute on function public.personal_permanente_de_la_vivienda(uuid) to authenticated, service_role;
