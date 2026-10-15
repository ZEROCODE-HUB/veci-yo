-- La portería reserva a nombre de una vivienda de su edificio (15/10/2026).
--
-- `20261015240000` le quitó a la portería toda escritura sobre las reservas.
-- El cliente lo corrigió: «el guardia debería poder reservar, pero él sí puede
-- elegir el depto», que es lo que hace la maqueta («¿Para qué departamento es
-- la reserva?»). Así que vuelve a **crear**, solo para viviendas del mismo
-- edificio que la zona. Cambiar y cancelar siguen siendo de la vivienda y de la
-- administración: su menú en la maqueta solo tiene «Editar personas» y
-- «Añadir incidencia».

drop policy if exists reserva_zona_alta on public.reserva_zona;
create policy reserva_zona_alta on public.reserva_zona
  for insert to authenticated
  with check (
    (public.es_miembro_unidad(unidad_id) and exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id and z.permite_estancia_larga))
    or exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id
        and (public.es_admin_condominio(z.condominio_id)
             or (public.es_guardia_de_condominio(z.condominio_id)
                 and public.condominio_de_unidad(reserva_zona.unidad_id) = z.condominio_id)))
  );
