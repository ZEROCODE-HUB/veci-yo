-- ----------------------------------------------------------------------------
-- La administracion no lee el chat de un residente con la porteria
-- ----------------------------------------------------------------------------
-- D-13 estaba abierto: "¿la administracion debe leer los chats de un residente
-- con la porteria? Hoy si, porque responde por su personal. En contra: son
-- conversaciones privadas."
--
-- Decidido que **no**. El prototipo lo dice en la propia pantalla del chat:
--
--   "Chat con Seguridad — el mensaje sera visible para todo el personal de
--    seguridad de turno."
--
-- Habla de seguridad, no de administracion. Quien escribe a la garita espera
-- que lo lea la garita.
--
-- La condicion era `es_personal_condominio`, que incluye a administrador y
-- coadministrador ademas de a los guardias. Pasa a ser el guardia, y nada mas.
--
-- Lo que se pierde: si alguien se queja del trato de un guardia, la
-- administracion ya no puede leer ese hilo. El camino para eso es una PQRS,
-- que existe y que a proposito **no se puede borrar** —ni siquiera por la
-- administracion— justamente para que una queja contra el personal no
-- desaparezca. El hilo del chat no era el sitio.

create or replace function public.es_guardia_de_condominio(p_condominio_id uuid)
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
  );
$$;

comment on function public.es_guardia_de_condominio(uuid) is
  'Solo la porteria. `es_personal_condominio` incluye tambien a la administracion, y hay sitios donde eso es justo lo que no se quiere.';

revoke all on function public.es_guardia_de_condominio(uuid) from public;
grant execute on function public.es_guardia_de_condominio(uuid) to authenticated;


create or replace function public.puede_ver_conversacion_fila(
  p_tipo           public.tipo_conversacion,
  p_area           public.area_conversacion,
  p_ambito         public.ambito_grupo,
  p_unidad_id      uuid,
  p_condominio_id  uuid,
  p_conversacion_id uuid
)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select case p_tipo
    when 'directa' then exists (
      select 1 from public.participante_conversacion p
      where p.conversacion_id = p_conversacion_id and p.usuario_id = auth.uid()
    )
    when 'area' then
      -- El huésped entra aquí mientras dure su estancia.
      public.es_residente_o_huesped(p_unidad_id)
      -- D-13: la porteria, no todo el personal. La administracion tiene su
      -- propio hilo y no entra en este.
      or (p_area = 'seguridad'      and public.es_guardia_de_condominio(p_condominio_id))
      or (p_area = 'administracion' and public.es_admin_condominio(p_condominio_id))
    when 'grupo' then
      -- Los grupos del edificio no: el huésped está de paso.
      case p_ambito
        when 'residentes' then exists (
          select 1 from public.membresia_unidad m
          join public.unidad u on u.id = m.unidad_id
          where m.usuario_id = auth.uid() and m.activo and m.es_residente
            and m.rol <> 'huesped_temporal'
            and u.condominio_id = p_condominio_id
        )
        when 'propietarios' then exists (
          select 1 from public.membresia_unidad m
          join public.unidad u on u.id = m.unidad_id
          where m.usuario_id = auth.uid() and m.activo and m.rol = 'propietario'
            and u.condominio_id = p_condominio_id
        )
        else false
      end
    else false
  end;
$$;


-- Abrir el hilo con la porteria tambien es de la porteria y de la vivienda.
drop policy if exists conversacion_alta on public.conversacion;
create policy conversacion_alta on public.conversacion
  for insert to authenticated
  with check (
    creada_por = auth.uid()
    and (
      (tipo = 'area' and (
        public.es_residente_o_huesped(unidad_id)
        or (area = 'seguridad'
            and public.es_guardia_de_condominio(condominio_id))
        or (area = 'administracion'
            and public.puede_coadmin(condominio_id, 'contestarChat'))
      ))
      or (tipo = 'directa' and public.es_miembro_condominio(condominio_id))
      or (tipo = 'grupo'
          and public.puede_coadmin(condominio_id, 'contestarChat'))
    )
  );
