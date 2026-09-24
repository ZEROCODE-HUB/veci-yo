-- ----------------------------------------------------------------------------
-- El huesped apunta a quien va con el
-- ----------------------------------------------------------------------------
-- La migracion 20260922197000 le concedio al huesped temporal reservar una
-- zona que no le este vedada, y funciona: la reserva se crea. Lo que no se
-- toco fue `participante_reserva`, cuya unica politica sigue apoyandose en
-- `puede_operar_unidad`, que desde 20260922194000 **excluye al huesped** a
-- proposito.
--
-- Asi que el flujo se parte por la mitad: la reserva entra y los acompañantes
-- los rechaza RLS con un 403, en mitad del guardado. La pantalla ofrecia
-- apuntar a la gente que va contigo y la base decia que no.
--
-- No es un permiso nuevo: es el mismo que ya tiene sobre la reserva, aplicado
-- a la tabla que cuelga de ella. Se usa `es_huesped_con_reserva`, que es lo
-- que comprueba hoy `reserva_zona_huesped_alta` --la migracion original decia
-- `es_huesped_de_unidad`, que 20260922201000 partio en dos--, porque un
-- participante no tiene sentido separado de la reserva a la que pertenece: si
-- puedes tener la reserva, puedes decir quien va contigo.
--
-- Va como `for all` a proposito, y no como cuatro politicas: aqui la pregunta
-- "¿puedes hacer **esto** con esta fila?" tiene la misma respuesta para leer,
-- insertar, corregir y quitar, porque las cuatro son la misma accion --editar
-- la lista de quien te acompaña-- sobre una reserva que ya es tuya. Donde eso
-- no se cumple, las politicas van separadas.

create policy participante_reserva_huesped on public.participante_reserva
  for all to authenticated
  using (
    exists (
      select 1 from public.reserva_zona r
      where r.id = participante_reserva.reserva_id
        and r.solicitada_por = auth.uid()
        and public.es_huesped_con_reserva(r.unidad_id)
    )
  )
  with check (
    exists (
      select 1 from public.reserva_zona r
      where r.id = participante_reserva.reserva_id
        and r.solicitada_por = auth.uid()
        and public.es_huesped_con_reserva(r.unidad_id)
    )
  );

comment on policy participante_reserva_huesped on public.participante_reserva is
  'El huesped edita la lista de acompañantes de SUS reservas, mientras su estancia siga vigente. Sin esto la reserva se creaba y los participantes devolvian 403.';
