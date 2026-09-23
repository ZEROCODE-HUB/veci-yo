-- ----------------------------------------------------------------------------
-- Lo que ve un coadministrador
-- ----------------------------------------------------------------------------
-- R-113. La pantalla de Coadministradores ofrece cuatro permisos de solo
-- lectura, y su descripcion —la misma en el prototipo y en la aplicacion— dice
-- exactamente que significan:
--
--   visualizarVisitas         "Acceso de solo lectura a TODAS las visitas"
--   visualizarCorrespondencia "Ver TODA la paqueteria del edificio"
--   visualizarZonasComunes    "Ver reservas, disponibilidad y ocupacion"
--   visualizarEncuestas       "Ver encuestas activas, historial y resultados"
--
-- O sea: si ve la vista de edificio de ese modulo, o solo lo de su vivienda.
-- No es una duda de producto —la descripcion la responde— y por eso se
-- implementa. Lo que sigue abierto es D-02, que es otra cosa: el alcance del
-- coadministrador de **unidad**.
--
-- Importa una cosa en cada politica: el permiso recorta lo que el
-- coadministrador ve **como administracion**, nunca lo suyo. Alguien que es
-- coadministrador y ademas vive en el edificio sigue viendo su propia
-- correspondencia y sus propias visitas aunque tenga los cuatro apagados. Un
-- permiso que le quitara eso seria un error, no una restriccion.

-- ----------------------------------------------------------------------------
-- Visitas
-- ----------------------------------------------------------------------------
drop policy if exists visita_lectura on public.visita;
create policy visita_lectura on public.visita
  for select to authenticated
  using (
    (unidad_id is not null and public.puede_operar_unidad(unidad_id))
    or (registrada_por = auth.uid()
        and unidad_id is not null
        and public.es_huesped_con_reserva(unidad_id))
    -- La porteria las necesita todas para trabajar; el coadministrador,
    -- segun su permiso.
    or public.es_guardia_de_condominio(condominio_id)
    or public.puede_coadmin(condominio_id, 'visualizarVisitas')
  );


-- ----------------------------------------------------------------------------
-- Correspondencia
-- ----------------------------------------------------------------------------
-- Estaba en una sola politica `for all`. Se parte: leerla es de la vivienda,
-- de la porteria y del coadministrador con permiso; registrarla y entregarla
-- sigue siendo de quien opera la unidad y de la porteria.
drop policy if exists correspondencia_acceso on public.correspondencia;

drop policy if exists correspondencia_lectura on public.correspondencia;
create policy correspondencia_lectura on public.correspondencia
  for select to authenticated
  using (
    public.es_miembro_unidad(unidad_id)
    or public.es_guardia_de_condominio(public.condominio_de_unidad(unidad_id))
    or public.puede_coadmin(
         public.condominio_de_unidad(unidad_id), 'visualizarCorrespondencia')
  );

drop policy if exists correspondencia_escritura on public.correspondencia;
create policy correspondencia_escritura on public.correspondencia
  for all to authenticated
  using (public.puede_operar_unidad(unidad_id))
  with check (public.puede_operar_unidad(unidad_id));


-- ----------------------------------------------------------------------------
-- Reservas de zonas comunes
-- ----------------------------------------------------------------------------
drop policy if exists reserva_zona_lectura on public.reserva_zona;
create policy reserva_zona_lectura on public.reserva_zona
  for select to authenticated
  using (
    public.puede_operar_unidad(unidad_id)
    or exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id
        and public.puede_coadmin(z.condominio_id, 'visualizarZonasComunes')
    )
  );


-- ----------------------------------------------------------------------------
-- Encuestas y anuncios
-- ----------------------------------------------------------------------------
-- `publicacion_lectura` decide la audiencia (R-62) y ademas dejaba pasar a
-- `es_personal_condominio` entero. Lo unico que cambia es esa segunda parte:
-- la porteria sigue, el coadministrador pasa a depender de su permiso.
drop policy if exists publicacion_lectura on public.publicacion;
create policy publicacion_lectura on public.publicacion
  for select to authenticated
  using (
    public.audiencia_alcanza(
      condominio_id, para_propietarios, para_residentes, para_huespedes)
    -- La porteria ve los anuncios del edificio para poder responder en la
    -- puerta; el coadministrador, segun su permiso.
    or public.es_guardia_de_condominio(condominio_id)
    or public.puede_coadmin(condominio_id, 'visualizarEncuestas')
  );

comment on column public.membresia_condominio.permisos is
  'Permisos granulares del coadministrador. Los ocho los imponen las politicas via puede_coadmin(); cuatro recortan lo que escribe y cuatro lo que ve como administracion, nunca lo suyo.';

-- ----------------------------------------------------------------------------
-- La segunda puerta: `for all` tambien concede SELECT
-- ----------------------------------------------------------------------------
-- Las cuatro politicas de lectura de arriba no servian de nada mientras al
-- lado viviera una `*_escritura` declarada `for all`: en Postgres eso cubre
-- **todos** los comandos, SELECT incluido, y las politicas permisivas se
-- suman con OR. El coadministrador seguia viendo el edificio entero por la
-- puerta de escritura, y las pruebas lo cazaron en la primera corrida.
--
-- Es la misma forma que ya aparecio en `membresia_unidad`, `reserva_zona`,
-- `reporte_legal` y `pago_cuota`: una politica `for all` que contesta "¿tienes
-- algo que ver con esta fila?" en vez de "¿puedes hacer **esto** con ella?".
--
-- Cada una se parte en tres con la misma condicion que tenia. No cambia quien
-- escribe; lo unico que cambia es que dejan de conceder lectura.

drop policy if exists visita_escritura on public.visita;
drop policy if exists visita_alta on public.visita;
create policy visita_alta on public.visita
  for insert to authenticated
  with check (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
    or (registrada_por = auth.uid()
        and unidad_id is not null
        and public.es_huesped_con_reserva(unidad_id))
  );
drop policy if exists visita_cambio on public.visita;
create policy visita_cambio on public.visita
  for update to authenticated
  using (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
    or (registrada_por = auth.uid()
        and unidad_id is not null
        and public.es_huesped_con_reserva(unidad_id))
  )
  with check (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
    or (registrada_por = auth.uid()
        and unidad_id is not null
        and public.es_huesped_con_reserva(unidad_id))
  );
drop policy if exists visita_baja on public.visita;
create policy visita_baja on public.visita
  for delete to authenticated
  using (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
  );


drop policy if exists correspondencia_escritura on public.correspondencia;
drop policy if exists correspondencia_alta on public.correspondencia;
create policy correspondencia_alta on public.correspondencia
  for insert to authenticated
  with check (public.puede_operar_unidad(unidad_id));
drop policy if exists correspondencia_cambio on public.correspondencia;
create policy correspondencia_cambio on public.correspondencia
  for update to authenticated
  using (public.puede_operar_unidad(unidad_id))
  with check (public.puede_operar_unidad(unidad_id));
drop policy if exists correspondencia_baja on public.correspondencia;
create policy correspondencia_baja on public.correspondencia
  for delete to authenticated
  using (public.puede_operar_unidad(unidad_id));


drop policy if exists reserva_zona_escritura on public.reserva_zona;
drop policy if exists reserva_zona_alta on public.reserva_zona;
create policy reserva_zona_alta on public.reserva_zona
  for insert to authenticated
  with check (
    (public.puede_operar_unidad(unidad_id)
     and exists (select 1 from public.zona_comun z
                 where z.id = reserva_zona.zona_id and z.permite_estancia_larga))
    or exists (select 1 from public.zona_comun z
               where z.id = reserva_zona.zona_id
                 and public.es_admin_condominio(z.condominio_id))
  );
drop policy if exists reserva_zona_cambio on public.reserva_zona;
create policy reserva_zona_cambio on public.reserva_zona
  for update to authenticated
  using (
    (public.puede_operar_unidad(unidad_id)
     and exists (select 1 from public.zona_comun z
                 where z.id = reserva_zona.zona_id and z.permite_estancia_larga))
    or exists (select 1 from public.zona_comun z
               where z.id = reserva_zona.zona_id
                 and public.es_admin_condominio(z.condominio_id))
  )
  with check (
    (public.puede_operar_unidad(unidad_id)
     and exists (select 1 from public.zona_comun z
                 where z.id = reserva_zona.zona_id and z.permite_estancia_larga))
    or exists (select 1 from public.zona_comun z
               where z.id = reserva_zona.zona_id
                 and public.es_admin_condominio(z.condominio_id))
  );
drop policy if exists reserva_zona_baja on public.reserva_zona;
create policy reserva_zona_baja on public.reserva_zona
  for delete to authenticated
  using (
    (public.puede_operar_unidad(unidad_id)
     and exists (select 1 from public.zona_comun z
                 where z.id = reserva_zona.zona_id and z.permite_estancia_larga))
    or exists (select 1 from public.zona_comun z
               where z.id = reserva_zona.zona_id
                 and public.es_admin_condominio(z.condominio_id))
  );


drop policy if exists publicacion_escritura on public.publicacion;
drop policy if exists publicacion_alta on public.publicacion;
create policy publicacion_alta on public.publicacion
  for insert to authenticated
  with check (public.es_admin_condominio(condominio_id));
drop policy if exists publicacion_cambio on public.publicacion;
create policy publicacion_cambio on public.publicacion
  for update to authenticated
  using (public.es_admin_condominio(condominio_id))
  with check (public.es_admin_condominio(condominio_id));
drop policy if exists publicacion_baja on public.publicacion;
create policy publicacion_baja on public.publicacion
  for delete to authenticated
  using (public.es_admin_condominio(condominio_id));

-- ----------------------------------------------------------------------------
-- La tercera puerta: "lo mio" no puede ser `puede_operar_unidad`
-- ----------------------------------------------------------------------------
--   puede_operar_unidad(u) = es_miembro_unidad(u)
--                            or es_personal_condominio(condominio_de_unidad(u))
--
-- O sea que la rama que dice "esto es de mi vivienda" ya dejaba pasar a todo
-- el personal del condominio por dentro, y el permiso del coadministrador
-- volvia a no servir de nada. Las pruebas lo cazaron igual que lo anterior.
--
-- En lectura, "lo mio" es `es_miembro_unidad`. El personal entra por su propia
-- rama, que es la que el permiso puede recortar. Es lo que
-- `correspondencia_lectura` ya hacia.
drop policy if exists visita_lectura on public.visita;
create policy visita_lectura on public.visita
  for select to authenticated
  using (
    (unidad_id is not null and public.es_miembro_unidad(unidad_id))
    or (registrada_por = auth.uid()
        and unidad_id is not null
        and public.es_huesped_con_reserva(unidad_id))
    or public.es_guardia_de_condominio(condominio_id)
    or public.puede_coadmin(condominio_id, 'visualizarVisitas')
  );

drop policy if exists reserva_zona_lectura on public.reserva_zona;
create policy reserva_zona_lectura on public.reserva_zona
  for select to authenticated
  using (
    public.es_miembro_unidad(unidad_id)
    or exists (
      select 1 from public.zona_comun z
      where z.id = reserva_zona.zona_id
        and public.puede_coadmin(z.condominio_id, 'visualizarZonasComunes')
    )
  );

-- ----------------------------------------------------------------------------
-- La cuarta puerta: las opciones de voto y los resultados
-- ----------------------------------------------------------------------------
-- Recortar `publicacion_lectura` no bastaba, porque el enunciado de una
-- encuesta esta tambien en `opcion_voto`, y esa politica pregunta por
-- `puede_ver_publicacion`, que seguia diciendo `es_personal_condominio`. Un
-- coadministrador sin `visualizarEncuestas` no veia la publicacion pero si sus
-- opciones —"¿Aprobar la cuota extraordinaria de $500.000?"— y, por
-- `resultados_publicacion`, tambien el recuento.
--
-- La funcion se alinea con la politica: quien ve una publicacion es su
-- audiencia, la porteria, y el coadministrador con permiso.
create or replace function public.puede_ver_publicacion(p_publicacion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.publicacion p
    where p.id = p_publicacion_id
      and p.deleted_at is null
      and (
        public.audiencia_alcanza(
          p.condominio_id, p.para_propietarios, p.para_residentes, p.para_huespedes)
        or public.es_guardia_de_condominio(p.condominio_id)
        or public.puede_coadmin(p.condominio_id, 'visualizarEncuestas')
      )
  );
$$;

-- Y la `for all` de las opciones, partida como las anteriores: escribirlas es
-- de la administracion, leerlas es de quien ve la publicacion.
drop policy if exists opcion_voto_escritura on public.opcion_voto;
drop policy if exists opcion_voto_alta on public.opcion_voto;
create policy opcion_voto_alta on public.opcion_voto
  for insert to authenticated
  with check (exists (
    select 1 from public.publicacion p
    where p.id = opcion_voto.publicacion_id
      and public.es_admin_condominio(p.condominio_id)
  ));
drop policy if exists opcion_voto_cambio on public.opcion_voto;
create policy opcion_voto_cambio on public.opcion_voto
  for update to authenticated
  using (exists (
    select 1 from public.publicacion p
    where p.id = opcion_voto.publicacion_id
      and public.es_admin_condominio(p.condominio_id)
  ))
  with check (exists (
    select 1 from public.publicacion p
    where p.id = opcion_voto.publicacion_id
      and public.es_admin_condominio(p.condominio_id)
  ));
drop policy if exists opcion_voto_baja on public.opcion_voto;
create policy opcion_voto_baja on public.opcion_voto
  for delete to authenticated
  using (exists (
    select 1 from public.publicacion p
    where p.id = opcion_voto.publicacion_id
      and public.es_admin_condominio(p.condominio_id)
  ));
