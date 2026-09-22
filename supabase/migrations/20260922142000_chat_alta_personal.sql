-- ----------------------------------------------------------------------------
-- La porteria y la administracion tambien abren el hilo
-- ----------------------------------------------------------------------------
-- `conversacion_alta` exigia `es_miembro_unidad` para abrir una conversacion
-- de area, de modo que solo la vivienda podia iniciarla. Pero el caso mas
-- comun del producto es el contrario: el guardia avisa de que llego un paquete
-- o de que hay alguien en recepcion, y hasta ahora no tenia donde escribir.
--
-- Cada area abre solo su propio hilo: la porteria no puede abrir en nombre de
-- la administracion ni al reves.

drop policy if exists conversacion_alta on public.conversacion;

create policy conversacion_alta on public.conversacion
  for insert to authenticated
  with check (
    creada_por = auth.uid()
    and (
      (tipo = 'area' and (
        public.es_miembro_unidad(unidad_id)
        or (area = 'seguridad'      and public.es_personal_condominio(condominio_id))
        or (area = 'administracion' and public.es_admin_condominio(condominio_id))
      ))
      or (tipo = 'directa' and public.es_miembro_condominio(condominio_id))
      or (tipo = 'grupo' and public.es_admin_condominio(condominio_id))
    )
  );
