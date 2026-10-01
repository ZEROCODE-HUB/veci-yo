-- ----------------------------------------------------------------------------
-- Las visitas del huesped
-- ----------------------------------------------------------------------------
-- Al dejar de ser "miembro de la unidad", el huesped perdio tambien el modulo
-- de Visitas, que su navegacion le sigue ofreciendo: quedaba vacio y sin poder
-- registrar nada.
--
-- Un huesped puede recibir gente mientras se aloja. Lo que no debe es ver las
-- visitas del propietario ni las de otros huespedes anteriores: solo las que
-- el mismo registro.

drop policy if exists visita_lectura on public.visita;

create policy visita_lectura on public.visita
  for select to authenticated
  using (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
    -- El huesped ve las suyas, no las de la vivienda.
    or (registrada_por = auth.uid() and unidad_id is not null
        and public.es_huesped_de_unidad(unidad_id))
  );

drop policy if exists visita_escritura on public.visita;

create policy visita_escritura on public.visita
  for all to authenticated
  using (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
    or (registrada_por = auth.uid() and unidad_id is not null
        and public.es_huesped_de_unidad(unidad_id))
  )
  with check (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
    -- Al crearla, la firma tiene que ser suya: un huesped no registra visitas
    -- a nombre del propietario.
    or (registrada_por = auth.uid() and unidad_id is not null
        and public.es_huesped_de_unidad(unidad_id))
  );

comment on policy visita_lectura on public.visita is
  'La porteria y la administracion ven las del condominio; la vivienda, las suyas; el huesped, solo las que el registro y mientras dure su estancia.';
