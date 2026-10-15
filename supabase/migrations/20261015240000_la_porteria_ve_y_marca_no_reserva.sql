-- La portería ve y marca las reservas, no las crea (15/10/2026).
--
-- Las tres políticas de escritura de `reserva_zona` usaban
-- `puede_operar_unidad`, que por dentro es «miembro de la vivienda **o
-- personal del edificio**». Así que un guardia podía, llamando a la base,
-- crear, mover o cancelar la reserva de cualquier vivienda. Su pantalla no lo
-- ofrece --la maqueta le da a la portería la grilla para mirar y el «Registro
-- de asistentes» para marcar quién llegó--, y la base tampoco tiene por qué.
--
-- Queda así:
--   · reservar, cambiar y cancelar: quien vive en la vivienda, o la
--     administración (que ya entraba por su propia rama);
--   · los asistentes: igual, más la portería, que **cambia** (marca llegó /
--     salió, corrige el nombre) y **añade** un reemplazo, como en la maqueta
--     («+ Reemplazar» cuando alguien sale). No borra.
--
-- Y de paso, el huésped: su política de «cancelación» le dejaba cambiar
-- cualquier columna, así que podía mover su reserva a otra fecha o zona fuera
-- de su estancia. Ahora lo que escribe tiene que cumplir lo mismo que al crearla.

drop policy if exists reserva_zona_alta on public.reserva_zona;
create policy reserva_zona_alta on public.reserva_zona
  for insert to authenticated
  with check (
    (public.es_miembro_unidad(unidad_id) and exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id and z.permite_estancia_larga))
    or exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id and public.es_admin_condominio(z.condominio_id))
  );

drop policy if exists reserva_zona_cambio on public.reserva_zona;
create policy reserva_zona_cambio on public.reserva_zona
  for update to authenticated
  using (
    (public.es_miembro_unidad(unidad_id) and exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id and z.permite_estancia_larga))
    or exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id and public.es_admin_condominio(z.condominio_id))
  )
  with check (
    (public.es_miembro_unidad(unidad_id) and exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id and z.permite_estancia_larga))
    or exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id and public.es_admin_condominio(z.condominio_id))
  );

drop policy if exists reserva_zona_baja on public.reserva_zona;
create policy reserva_zona_baja on public.reserva_zona
  for delete to authenticated
  using (
    (public.es_miembro_unidad(unidad_id) and exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id and z.permite_estancia_larga))
    or exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id and public.es_admin_condominio(z.condominio_id))
  );

-- El huésped: lo que deja escrito cumple lo mismo que al reservar.
drop policy if exists reserva_zona_huesped_cancelacion on public.reserva_zona;
create policy reserva_zona_huesped_cancelacion on public.reserva_zona
  for update to authenticated
  using (solicitada_por = auth.uid() and public.es_huesped_con_reserva(unidad_id))
  with check (
    solicitada_por = auth.uid()
    and public.es_huesped_con_reserva(unidad_id)
    and public.estancia_cubre_fecha(unidad_id, fecha)
    and exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id
        and case when public.mi_estancia_es_corta(reserva_zona.unidad_id)
                 then z.permite_estancia_corta
                 else z.permite_estancia_larga end)
  );

-- Los asistentes: vivienda y administración todo; la portería, aparte.
drop policy if exists participante_reserva_acceso on public.participante_reserva;
create policy participante_reserva_acceso on public.participante_reserva
  for all to authenticated
  using (exists (
    select 1 from public.reserva_zona r
    where r.id = participante_reserva.reserva_id
      and (public.es_miembro_unidad(r.unidad_id)
           or public.es_admin_condominio(public.condominio_de_unidad(r.unidad_id)))))
  with check (exists (
    select 1 from public.reserva_zona r
    where r.id = participante_reserva.reserva_id
      and (public.es_miembro_unidad(r.unidad_id)
           or public.es_admin_condominio(public.condominio_de_unidad(r.unidad_id)))));

-- La portería añade el reemplazo de quien salió.
drop policy if exists participante_reserva_porteria_alta on public.participante_reserva;
create policy participante_reserva_porteria_alta on public.participante_reserva
  for insert to authenticated
  with check (exists (
    select 1 from public.reserva_zona r
    join public.zona_comun z on z.id = r.zona_id
    where r.id = participante_reserva.reserva_id
      and public.es_guardia_de_condominio(z.condominio_id)));
