-- ----------------------------------------------------------------------------
-- El huésped tiene que saber dónde se aloja
-- ----------------------------------------------------------------------------
-- Efecto en cadena de 20260922192000: al sacar al huésped de
-- `es_miembro_condominio` perdió la lectura de `unidad`, `torre` y
-- `condominio`, que son las tres tablas de cuya lectura sale la cabecera de la
-- aplicación.
--
-- Comprobado con una sesión real en el navegador: un huésped con estancia
-- vigente veía **"Torre 0 ·"**, sin número de torre y sin código de vivienda.
-- La membresía se leía bien —`membresia_unidad` deja ver la propia—, pero el
-- join a `unidad` volvía vacío y el cliente caía al valor por defecto.
--
-- No es un problema de presentación: el huésped literalmente no podía saber a
-- qué puerta llamar.
--
-- Se le concede lo justo: su vivienda, la torre de su vivienda y el
-- condominio donde está. No las demás unidades ni las demás torres.

drop policy if exists unidad_lectura on public.unidad;

create policy unidad_lectura on public.unidad
  for select to authenticated
  using (
    public.es_miembro_condominio(condominio_id)
    or public.es_huesped_de_unidad(id)
  );

comment on policy unidad_lectura on public.unidad is
  'Los miembros del condominio ven todas sus unidades; el huesped temporal, solo aquella donde se aloja y mientras dure la estancia.';


-- La torre: solo aquella en la que está la vivienda donde se aloja.
drop policy if exists torre_lectura on public.torre;

create policy torre_lectura on public.torre
  for select to authenticated
  using (
    public.es_miembro_condominio(condominio_id)
    or exists (
      select 1
      from public.unidad u
      where u.torre_id = torre.id
        and public.es_huesped_de_unidad(u.id)
    )
  );

comment on policy torre_lectura on public.torre is
  'La torre donde el huesped se aloja, no las demas.';


-- El condominio: el nombre del edificio, que aparece en la cabecera y en el
-- reglamento que sí puede leer.
drop policy if exists condominio_lectura on public.condominio;

create policy condominio_lectura on public.condominio
  for select to authenticated
  using (
    public.es_miembro_condominio(id)
    or public.es_huesped_del_condominio(id)
  );
