-- El chat apagado de un guardia, también en la base (15/10/2026, hueco 22).
--
-- La administración apaga el chat de un guardia con `permisos.chat = false`
-- en su membresía, y la pantalla le esconde el chat. Pero la base lo dejaba
-- pasar: `puede_ver_conversacion_fila` y `conversacion_alta` preguntaban solo
-- `es_guardia_de_condominio`, así que llamando a la API seguía leyendo y
-- escribiendo en los hilos de portería con las viviendas.
--
-- `guardia_con_chat` mira lo mismo que la pantalla: sin la clave, apagado
-- (`permisoPuesto` en seguridad.repo da falso si falta).

create or replace function public.guardia_con_chat(p_condominio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_condominio mc
    where mc.condominio_id = p_condominio_id
      and mc.usuario_id = auth.uid()
      and mc.rol = 'guardia'
      and mc.activo
      and coalesce((mc.permisos ->> 'chat')::boolean, false)
  );
$$;

revoke all on function public.guardia_con_chat(uuid) from public, anon;
grant execute on function public.guardia_con_chat(uuid) to authenticated;

create or replace function public.puede_ver_conversacion_fila(
  p_tipo public.tipo_conversacion, p_area public.area_conversacion,
  p_ambito public.ambito_grupo, p_unidad_id uuid, p_condominio_id uuid,
  p_conversacion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case p_tipo
    when 'directa' then exists (
      select 1 from public.participante_conversacion p
      where p.conversacion_id = p_conversacion_id and p.usuario_id = auth.uid()
    )
    when 'area' then
      -- El huesped entra aqui mientras dure su estancia.
      public.es_residente_o_huesped(p_unidad_id)
      -- D-13: la porteria, no todo el personal, y solo el guardia con el chat
      -- encendido (hueco 22). La administracion tiene su propio hilo.
      or (p_area = 'seguridad'      and public.guardia_con_chat(p_condominio_id))
      or (p_area = 'administracion' and public.es_admin_condominio(p_condominio_id))
    when 'grupo' then
      -- Y solo los roles del canal. Quien administra entra si su rol esta en
      -- la lista, como cualquiera.
      public.es_del_canal(p_conversacion_id)
    else false
  end;
$$;

drop policy if exists conversacion_alta on public.conversacion;
create policy conversacion_alta on public.conversacion
  for insert to authenticated
  with check (
    creada_por = auth.uid()
    and (
      (tipo = 'area' and (
        public.es_residente_o_huesped(unidad_id)
        or (area = 'seguridad' and public.guardia_con_chat(condominio_id))
        or (area = 'administracion' and public.puede_coadmin(condominio_id, 'contestarChat'))))
      or (tipo = 'grupo' and public.puede_coadmin(condominio_id, 'contestarChat'))
    )
  );
