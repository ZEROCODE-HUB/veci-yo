-- ----------------------------------------------------------------------------
-- Un huésped no es un vecino
-- ----------------------------------------------------------------------------
-- Al dar de alta el rol `huesped_temporal` en `membresia_unidad` se cuidó que
-- `es_miembro_unidad` no lo incluyera, para no concederle sin querer lo de un
-- residente. Pero se pasó por alto `es_miembro_condominio`, que mira las
-- membresías de unidad **de cualquier rol**: el huésped quedaba dentro.
--
-- Con una sesión real de un huésped se comprobó que eso le daba:
--   · el cuadro de honor completo, con el nombre del responsable de cada
--     vivienda —y el alias de quien había pedido no figurar—;
--   · los anuncios y las votaciones del edificio.
--
-- Ninguna de las dos le corresponde: está de paso unos días. Se excluye del
-- concepto de "miembro del condominio" y se le concede aparte lo que sí
-- necesita.

create or replace function public.es_miembro_condominio(p_condominio_id uuid)
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
      and mc.activo
  ) or exists (
    select 1
    from public.membresia_unidad mu
    join public.unidad u on u.id = mu.unidad_id
    where u.condominio_id = p_condominio_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      -- El huésped temporal no cuenta: vive aquí unos días, no pertenece a la
      -- comunidad. Lo que sí necesita se le concede de forma explícita.
      and mu.rol <> 'huesped_temporal'
  );
$$;

comment on function public.es_miembro_condominio(uuid) is
  'Pertenece a la comunidad: personal del condominio o residente de alguna unidad. NO incluye al huesped temporal.';


-- ----------------------------------------------------------------------------
-- Lo que un huésped sí necesita del condominio
-- ----------------------------------------------------------------------------

create or replace function public.es_huesped_del_condominio(p_condominio_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.membresia_unidad mu
    join public.unidad u on u.id = mu.unidad_id
    where u.condominio_id = p_condominio_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      and mu.rol = 'huesped_temporal'
      and (mu.vigente_desde is null or mu.vigente_desde <= current_date)
      and (mu.vigente_hasta is null or mu.vigente_hasta >= current_date)
  );
$$;

-- Las zonas comunes: necesita saber qué hay y a qué hora abre. Reservarlas
-- depende además de `restringida_huesped`, que ya existe en la tabla.
drop policy if exists zona_comun_lectura on public.zona_comun;

create policy zona_comun_lectura on public.zona_comun
  for select to authenticated
  using (
    public.es_miembro_condominio(condominio_id)
    or public.es_huesped_del_condominio(condominio_id)
  );

-- Las preguntas frecuentes del edificio: horarios, cómo funciona el chat.
drop policy if exists pregunta_frecuente_lectura on public.pregunta_frecuente;

create policy pregunta_frecuente_lectura on public.pregunta_frecuente
  for select to authenticated
  using (
    public.es_miembro_condominio(condominio_id)
    or public.es_huesped_del_condominio(condominio_id)
  );

-- Y poder abrir una PQRS: si hay un problema en la vivienda durante su
-- estancia, es quien lo sufre.
drop policy if exists reclamo_alta on public.reclamo;

create policy reclamo_alta on public.reclamo
  for insert to authenticated
  with check (
    creado_por = auth.uid()
    and (
      public.es_miembro_condominio(condominio_id)
      or public.es_huesped_del_condominio(condominio_id)
    )
  );
