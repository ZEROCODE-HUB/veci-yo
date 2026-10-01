-- ----------------------------------------------------------------------------
-- Quien reservo, y con que nombre
-- ----------------------------------------------------------------------------
-- La pantalla de gestion de reservas del administrador muestra, bajo la
-- etiqueta **"Residente"**, el campo `reservation.nombre`. Y `nombre`, en el
-- mapeo de reservas, es esto:
--
--   nombre: fila.zona?.nombre ?? ""
--
-- El nombre de la ZONA. O sea que la lista de reservas de la piscina decia
-- "Piscina" en la columna del residente, para todas. Es el mismo campo que ya
-- habia provocado R-46: "Mis reservas" mostraba 0 porque el respaldo comparaba
-- el nombre de la persona con `reserva.nombre`, que es el de la zona.
--
-- Y encima el modal de editar ofrecia una lista de residentes escrita a mano
-- —"Alberto Manual", "Sofia Martinez", "Luis Torres"— que no existe en ningun
-- condominio.
--
-- Aqui esta el nombre de verdad. Y con el, R-78: `perfil.usa_alias_zonas`
-- existe para que quien no quiera figurar con su nombre en las zonas comunes
-- aparezca con su alias. Su hermana `usa_alias_cuadro_honor` si se respeta
-- desde 20260922121000; esta no se aplicaba en ningun sitio, asi que la
-- casilla estaba en el perfil sin efecto.
--
-- Va en lote y no fila a fila para no hacer una llamada por reserva, y es
-- `security definer` porque leer el perfil de un vecino no esta permitido: lo
-- unico que sale de aqui es el nombre con el que esa persona quiere figurar,
-- y solo de reservas que quien pregunta ya puede ver.

create or replace function public.solicitantes_de_reservas(p_reservas uuid[])
returns table (reserva_id uuid, solicitante text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.id,
    coalesce(
      -- Si pidio figurar con alias en las zonas, el nombre real no sale.
      case when p.usa_alias_zonas then nullif(p.alias, '') end,
      nullif(btrim(coalesce(p.nombre, '') || ' ' || coalesce(p.apellido, '')), ''),
      m.nombre
    )
  from public.reserva_zona r
  left join public.perfil p on p.id = r.solicitada_por
  left join public.membresia_unidad m
         on m.unidad_id = r.unidad_id
        and m.usuario_id = r.solicitada_por
        and m.activo
  where r.id = any(p_reservas)
    -- La misma visibilidad que la politica de la tabla: quien opera la
    -- vivienda, la administracion del condominio, y el huesped sobre la suya.
    and (
      public.puede_operar_unidad(r.unidad_id)
      or exists (
        select 1 from public.zona_comun z
        where z.id = r.zona_id and public.es_admin_condominio(z.condominio_id)
      )
      or (r.solicitada_por = auth.uid())
    );
$$;

comment on function public.solicitantes_de_reservas(uuid[]) is
  'El nombre de quien pidio cada reserva, respetando perfil.usa_alias_zonas. Antes la pantalla mostraba el nombre de la zona bajo la etiqueta "Residente".';

revoke all on function public.solicitantes_de_reservas(uuid[]) from public;
grant execute on function public.solicitantes_de_reservas(uuid[]) to authenticated;
