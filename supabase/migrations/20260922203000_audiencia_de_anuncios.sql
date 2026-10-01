-- ----------------------------------------------------------------------------
-- La audiencia de un anuncio la decide la base, no la pantalla
-- ----------------------------------------------------------------------------
-- `publicacion` tiene tres casillas —`para_propietarios`, `para_residentes` y
-- `para_huespedes`— que el formulario ofrece marcar al publicar. Ninguna
-- servía para nada:
--
-- · `publicacion_lectura` era `es_miembro_condominio(condominio_id)` a secas,
--   sin mirar las casillas. Un anuncio dirigido "solo a propietarios" lo leía
--   cualquier residente. Y no solo en la pantalla: salía en la respuesta de la
--   API, que es el único sitio que importa.
-- · Lo único que filtraba era `useAnuncios`, en el cliente, y solo para el
--   huésped.
-- · `para_huespedes` era directamente una casilla muerta: el huésped no está
--   en `es_miembro_condominio`, así que marcarla no le mostraba nada.
--
-- Es el patrón que este proyecto ya tiene escrito en su documentación: si el
-- dato sale de la base para esconderse en la pantalla, basta con mirar la
-- respuesta de la API.
--
-- Se mueve la decisión a RLS. Y con ella, el derecho a votar: una encuesta
-- dirigida a propietarios no puede aceptar el voto de quien no lo es.

create or replace function public.es_propietario_en_condominio(p_condominio_id uuid)
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
      and mu.rol = 'propietario'
  );
$$;

comment on function public.es_propietario_en_condominio(uuid) is
  'Es duenio de alguna vivienda del condominio. Viva en ella o no: esa es la diferencia con es_residente_en_condominio.';


create or replace function public.es_residente_en_condominio(p_condominio_id uuid)
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
      and mu.es_residente
      -- El huesped vive aqui unos dias; tiene su propia casilla.
      and mu.rol <> 'huesped_temporal'
  );
$$;

comment on function public.es_residente_en_condominio(uuid) is
  'Vive en alguna vivienda del condominio. Un propietario que no reside queda fuera; un inquilino sin propiedad, dentro.';


/**
 * Recibe las casillas en vez de buscarlas.
 *
 * Una politica de SELECT no puede releer su propia tabla a traves de una
 * funcion `stable` —durante el `RETURNING` de un INSERT la fila nueva no esta
 * en el snapshot y el alta se rechaza—. Es la misma razon por la que
 * `puede_ver_conversacion_fila` recibe columnas.
 */
create or replace function public.audiencia_alcanza(
  p_condominio_id uuid,
  p_para_propietarios boolean,
  p_para_residentes boolean,
  p_para_huespedes boolean
)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select (p_para_propietarios and public.es_propietario_en_condominio(p_condominio_id))
      or (p_para_residentes   and public.es_residente_en_condominio(p_condominio_id))
      or (p_para_huespedes    and public.es_huesped_del_condominio(p_condominio_id));
$$;


drop policy if exists publicacion_lectura on public.publicacion;

create policy publicacion_lectura on public.publicacion
  for select to authenticated
  using (
    -- La administracion y la porteria ven el tablon entero: responden por el.
    public.es_personal_condominio(condominio_id)
    or public.audiencia_alcanza(
         condominio_id, para_propietarios, para_residentes, para_huespedes)
  );

comment on policy publicacion_lectura on public.publicacion is
  'Cada quien ve lo que va dirigido a el. Las tres casillas de audiencia dejan de ser decorativas.';


-- ----------------------------------------------------------------------------
-- Y el voto sigue a la publicación
-- ----------------------------------------------------------------------------

create or replace function public.puede_ver_publicacion(p_publicacion_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.publicacion p
    where p.id = p_publicacion_id
      and p.deleted_at is null
      and (
        public.es_personal_condominio(p.condominio_id)
        or public.audiencia_alcanza(
             p.condominio_id, p.para_propietarios, p.para_residentes, p.para_huespedes)
      )
  );
$$;

comment on function public.puede_ver_publicacion(uuid) is
  'Mismo criterio que publicacion_lectura, para las tablas que cuelgan de ella. Aqui si puede leer publicacion: es otra tabla.';


drop policy if exists opcion_voto_lectura on public.opcion_voto;

create policy opcion_voto_lectura on public.opcion_voto
  for select to authenticated
  using (public.puede_ver_publicacion(publicacion_id));


drop policy if exists voto_propio_escritura on public.voto;

create policy voto_propio_escritura on public.voto
  for all to authenticated
  using (usuario_id = auth.uid())
  with check (
    usuario_id = auth.uid()
    and public.puede_ver_publicacion(publicacion_id)
    -- El huesped esta de paso: no vota, aunque el anuncio vaya dirigido a el.
    and exists (
      select 1 from public.publicacion p
      where p.id = voto.publicacion_id
        and public.es_miembro_condominio(p.condominio_id)
        and p.tipo = 'encuesta'
        and (p.publicada_hasta is null or p.publicada_hasta > now())
    )
  );

comment on policy voto_propio_escritura on public.voto is
  'Se vota lo propio, en una encuesta abierta que va dirigida a uno. Una encuesta de propietarios no acepta el voto de quien no lo es.';


-- Los recuentos, igual: quien no ve la encuesta no ve su resultado.
create or replace function public.resultados_publicacion(p_publicacion_id uuid)
returns table(opcion_id uuid, etiqueta text, votos bigint)
language sql stable security definer set search_path = public, pg_temp
as $$
  select o.id, o.etiqueta, count(v.id)
  from public.opcion_voto o
  left join public.voto v on v.opcion_id = o.id
  where o.publicacion_id = p_publicacion_id
    and public.puede_ver_publicacion(p_publicacion_id)
  group by o.id, o.etiqueta
  order by o.orden;
$$;
