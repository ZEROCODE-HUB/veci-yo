-- El huésped ve los cierres y horarios especiales de las zonas (15/10/2026).
--
-- `zona_fecha_especial_lectura` pedía `es_miembro_condominio`, que deja fuera
-- al huésped temporal a propósito. Pero la zona sí la ve
-- (`zona_comun_lectura` incluye `es_huesped_del_condominio`), así que la
-- pantalla le pintaba la grilla sin los cierres y le ofrecía franjas de un
-- día cerrado. La base ya le rechazaba la reserva --el disparador
-- `respetar_dias_de_la_zona` es definer y sí lo lee--; lo que faltaba era que
-- la pantalla pudiera decírselo antes.

drop policy if exists zona_fecha_especial_lectura on public.zona_fecha_especial;
create policy zona_fecha_especial_lectura on public.zona_fecha_especial
  for select to authenticated
  using (exists (
    select 1 from public.zona_comun z
    where z.id = zona_fecha_especial.zona_id
      and (public.es_miembro_condominio(z.condominio_id)
           or public.es_huesped_del_condominio(z.condominio_id))));
