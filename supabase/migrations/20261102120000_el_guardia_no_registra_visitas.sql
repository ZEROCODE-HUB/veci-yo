-- El guardia no registra visitas (Para Claude 200, confirmado por el usuario
-- el 02/11/2026). La actualización 88 lo quitó de la pantalla; aquí se cierra
-- también en la base: del personal del edificio solo la administración
-- (administrador y coadministrador) puede dar de alta una visita. El guardia
-- sigue viéndolas, registrando llegada y salida y anotándolas, y si además vive
-- en una vivienda la registra como vecino.
--
-- Ojo: la rama de la vivienda era `puede_operar_unidad`, que por dentro es
-- `es_miembro_unidad or es_personal_condominio`: el guardia entraba por ahí
-- aunque se cerrara la primera rama. Se usa `es_miembro_unidad` directamente
-- (la administración ya entra por `es_admin_condominio`).
drop policy if exists visita_alta on public.visita;
create policy visita_alta on public.visita
  for insert to authenticated
  with check (
    public.es_admin_condominio(condominio_id)
    or (unidad_id is not null and public.es_miembro_unidad(unidad_id))
    or (
      registrada_por = auth.uid()
      and unidad_id is not null
      and public.es_huesped_con_reserva(unidad_id)
      and public.huesped_puede_registrar_visitas(unidad_id)
    )
  );
