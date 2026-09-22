-- ----------------------------------------------------------------------------
-- El huésped puede reservar las zonas que no le estén vedadas
-- ----------------------------------------------------------------------------
-- `zona_comun.restringida_huesped` existe para decir qué zonas no puede usar un
-- huésped, y `ZonasComunesScreen` ya pinta el candado a partir de esa bandera.
-- Pero las políticas de `reserva_zona` se apoyan en `puede_operar_unidad`, que
-- desde 20260922194000 excluye al huésped: no podía reservar **ninguna**, ni
-- siquiera la piscina.
--
-- Con eso la columna quedaba muerta —daba igual su valor— y la pantalla
-- prometía algo que la base rechazaba.
--
-- Se le concede reservar, con tres límites que las políticas del residente no
-- necesitan:
--   · solo zonas con `restringida_huesped = false`;
--   · solo a su nombre (`solicitada_por = auth.uid()`);
--   · solo mientras su estancia esté vigente, que es lo que comprueba
--     `es_huesped_de_unidad`.
--
-- Y ve y cancela lo suyo, no lo del propietario de la vivienda: para el
-- residente la reserva es de la unidad, para el huésped es personal.

create policy reserva_zona_huesped_lectura on public.reserva_zona
  for select to authenticated
  using (
    solicitada_por = auth.uid()
    and public.es_huesped_de_unidad(unidad_id)
  );

comment on policy reserva_zona_huesped_lectura on public.reserva_zona is
  'El huesped ve sus propias reservas, no las del propietario de la vivienda.';


create policy reserva_zona_huesped_alta on public.reserva_zona
  for insert to authenticated
  with check (
    solicitada_por = auth.uid()
    and public.es_huesped_de_unidad(unidad_id)
    and exists (
      select 1 from public.zona_comun z
      where z.id = zona_id
        and not z.restringida_huesped
    )
  );

comment on policy reserva_zona_huesped_alta on public.reserva_zona is
  'Solo zonas no restringidas al huesped, solo a su nombre y solo con la estancia vigente.';


-- Cancelar lo que él mismo pidió. No puede tocar la zona ni la unidad de la
-- reserva: el `with check` repite las condiciones del `using`.
create policy reserva_zona_huesped_cancelacion on public.reserva_zona
  for update to authenticated
  using (
    solicitada_por = auth.uid()
    and public.es_huesped_de_unidad(unidad_id)
  )
  with check (
    solicitada_por = auth.uid()
    and public.es_huesped_de_unidad(unidad_id)
  );
