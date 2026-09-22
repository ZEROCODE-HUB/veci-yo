-- ----------------------------------------------------------------------------
-- Antes de llegar: el alojamiento se ve desde que se acepta; las llaves, no
-- ----------------------------------------------------------------------------
-- `es_huesped_de_unidad` exigía que la estancia estuviera vigente **hoy**. Como
-- consecuencia, entre aceptar la invitación y el día de entrada la aplicación
-- estaba completamente vacía: ni la dirección, ni el edificio, ni las zonas
-- comunes, ni el chat con la portería. Es justo el rato en que más se mira.
--
-- Pero tampoco vale abrirlo todo: el libro del alojamiento dice dónde está la
-- llave y cómo se abre la puerta. Eso no puede estar disponible desde el
-- momento en que alguien reserva, semanas antes.
--
-- Se parte en dos, y los nombres lo dicen, para que la próxima vez nadie use
-- una donde iba la otra —que es exactamente lo que pasó con
-- `puede_operar_unidad`—:
--
--   · `es_huesped_con_reserva` → tiene una estancia que **todavía no terminó**,
--     haya empezado o no. Es lo que da acceso a todo lo del alojamiento.
--   · `es_huesped_alojado`     → **hoy** está dentro de las fechas. Reservado
--     para las credenciales de acceso físico.
--
-- La segunda está contenida en la primera: quien está alojado tiene reserva.

create or replace function public.es_huesped_con_reserva(p_unidad_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = p_unidad_id
      and m.usuario_id = auth.uid()
      and m.activo
      and m.rol = 'huesped_temporal'
      -- Sin mirar `vigente_desde`: la estancia futura tambien cuenta.
      and (m.vigente_hasta is null or m.vigente_hasta >= current_date)
  );
$$;

comment on function public.es_huesped_con_reserva(uuid) is
  'Tiene una estancia que todavia no termino, haya empezado o no. Es el acceso a todo lo del alojamiento MENOS las credenciales de entrada.';


create or replace function public.es_huesped_alojado(p_unidad_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = p_unidad_id
      and m.usuario_id = auth.uid()
      and m.activo
      and m.rol = 'huesped_temporal'
      and (m.vigente_desde is null or m.vigente_desde <= current_date)
      and (m.vigente_hasta is null or m.vigente_hasta >= current_date)
  );
$$;

comment on function public.es_huesped_alojado(uuid) is
  'HOY esta dentro de las fechas de la estancia. Reservado para las credenciales de acceso fisico: donde esta la llave y como se abre la puerta.';


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
      and (mu.vigente_hasta is null or mu.vigente_hasta >= current_date)
  );
$$;

comment on function public.es_huesped_del_condominio(uuid) is
  'Tiene una estancia sin terminar en alguna vivienda del condominio. Mismo criterio que es_huesped_con_reserva, a nivel de edificio.';


create or replace function public.es_residente_o_huesped(p_unidad_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select public.es_miembro_unidad(p_unidad_id)
      or public.es_huesped_con_reserva(p_unidad_id);
$$;

comment on function public.es_residente_o_huesped(uuid) is
  'Quien vive en la vivienda y quien tiene una estancia sin terminar. Se usa para el chat: preguntar por el acceso ANTES de llegar es el caso normal.';


-- ----------------------------------------------------------------------------
-- Las credenciales: solo estando alojado
-- ----------------------------------------------------------------------------

drop policy if exists libro_huesped_lectura on public.libro_huesped;

create policy libro_huesped_lectura on public.libro_huesped
  for select to authenticated
  using (
    public.puede_operar_unidad(unidad_id)
    or public.es_huesped_alojado(unidad_id)
  );

comment on policy libro_huesped_lectura on public.libro_huesped is
  'El anfitrion y la administracion siempre. El huesped SOLO desde el dia de entrada: aqui esta donde queda la llave.';


-- ----------------------------------------------------------------------------
-- Todo lo demas: desde que se acepta la invitacion
-- ----------------------------------------------------------------------------

drop policy if exists unidad_lectura on public.unidad;
create policy unidad_lectura on public.unidad
  for select to authenticated
  using (
    public.es_miembro_condominio(condominio_id)
    or public.es_huesped_con_reserva(id)
  );

drop policy if exists torre_lectura on public.torre;
create policy torre_lectura on public.torre
  for select to authenticated
  using (
    public.es_miembro_condominio(condominio_id)
    or exists (
      select 1 from public.unidad u
      where u.torre_id = torre.id
        and public.es_huesped_con_reserva(u.id)
    )
  );

drop policy if exists visita_lectura on public.visita;
create policy visita_lectura on public.visita
  for select to authenticated
  using (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
    or (registrada_por = auth.uid() and unidad_id is not null
        and public.es_huesped_con_reserva(unidad_id))
  );

drop policy if exists visita_escritura on public.visita;
create policy visita_escritura on public.visita
  for all to authenticated
  using (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
    or (registrada_por = auth.uid() and unidad_id is not null
        and public.es_huesped_con_reserva(unidad_id))
  )
  with check (
    public.es_personal_condominio(condominio_id)
    or (unidad_id is not null and public.puede_operar_unidad(unidad_id))
    or (registrada_por = auth.uid() and unidad_id is not null
        and public.es_huesped_con_reserva(unidad_id))
  );

drop policy if exists reserva_zona_huesped_lectura on public.reserva_zona;
create policy reserva_zona_huesped_lectura on public.reserva_zona
  for select to authenticated
  using (
    solicitada_por = auth.uid()
    and public.es_huesped_con_reserva(unidad_id)
  );

drop policy if exists reserva_zona_huesped_cancelacion on public.reserva_zona;
create policy reserva_zona_huesped_cancelacion on public.reserva_zona
  for update to authenticated
  using (
    solicitada_por = auth.uid()
    and public.es_huesped_con_reserva(unidad_id)
  )
  with check (
    solicitada_por = auth.uid()
    and public.es_huesped_con_reserva(unidad_id)
  );


-- Reservar una zona: ahora se puede antes de llegar, que es lo natural —se
-- reserva la parrilla al organizar el viaje—. Y por eso mismo aparece una
-- pregunta que antes no existia: **para que dia**. Hasta ahora nada impedia
-- que un huesped reservara el salon para dentro de un año.
create or replace function public.estancia_cubre_fecha(p_unidad_id uuid, p_fecha date)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_unidad m
    where m.unidad_id = p_unidad_id
      and m.usuario_id = auth.uid()
      and m.activo
      and m.rol = 'huesped_temporal'
      and (m.vigente_desde is null or p_fecha >= m.vigente_desde)
      and (m.vigente_hasta is null or p_fecha <= m.vigente_hasta)
  );
$$;

comment on function public.estancia_cubre_fecha(uuid, date) is
  'La fecha cae dentro de la estancia de quien pregunta. Para que un huesped no reserve una zona para un dia en que ya no estara.';

drop policy if exists reserva_zona_huesped_alta on public.reserva_zona;
create policy reserva_zona_huesped_alta on public.reserva_zona
  for insert to authenticated
  with check (
    solicitada_por = auth.uid()
    and public.es_huesped_con_reserva(unidad_id)
    and public.estancia_cubre_fecha(unidad_id, fecha)
    and exists (
      select 1 from public.zona_comun z
      where z.id = zona_id
        and not z.restringida_huesped
    )
  );

comment on policy reserva_zona_huesped_alta on public.reserva_zona is
  'Solo zonas no restringidas, solo a su nombre y solo para un dia en que este alojado. Puede reservarlas antes de llegar.';


-- El reglamento repetia a mano la consulta de la vigencia. Pasa a llamar a la
-- funcion, para que no haya dos sitios donde cambiarla.
drop policy if exists reglamento_lectura on public.reglamento;
create policy reglamento_lectura on public.reglamento
  for select to authenticated
  using (
    public.es_miembro_condominio(condominio_id)
    or public.es_huesped_del_condominio(condominio_id)
  );


-- Las dos funciones acotadas del alojamiento. Postgres NO rastrea que una
-- funcion llame a otra cuando el cuerpo va entre `$$`, asi que eliminar el
-- nombre viejo sin tocarlas las dejaria rotas en tiempo de ejecucion y sin un
-- solo aviso. Se reescriben aqui, con la semantica nueva: la ficha y los
-- contactos se ven desde que se acepta.
create or replace function public.ficha_alojamiento(p_unidad_id uuid)
returns table (
  descripcion       text,
  num_habitaciones  integer,
  max_huespedes     integer,
  estacionamientos  integer,
  permite_mascotas  boolean,
  apto_ninos        boolean
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select
    coalesce(s.descripcion, ''),
    coalesce(t.habitaciones, 0),
    coalesce(s.max_huespedes, 0),
    s.estacionamientos_huesped,
    coalesce(pv_unidad.corta_permite_mascotas, pv_defecto.corta_permite_mascotas, false),
    coalesce(pv_unidad.corta_permite_ninos,    pv_defecto.corta_permite_ninos,    false)
  from public.unidad u
  join public.suscripcion_renta_corta s on s.unidad_id = u.id
  left join public.tipologia t on t.id = u.tipologia_id
  left join public.permiso_vivienda pv_unidad on pv_unidad.unidad_id = u.id
  left join public.permiso_vivienda pv_defecto
         on pv_defecto.unidad_id is null
        and pv_defecto.condominio_id = u.condominio_id
  where u.id = p_unidad_id
    and (
      public.puede_operar_unidad(p_unidad_id)
      or public.es_huesped_con_reserva(p_unidad_id)
    );
$$;

create or replace function public.contactos_de_unidad(p_unidad_id uuid)
returns table (
  anfitrion_nombre        text,
  anfitrion_telefono      text,
  administrador_nombre    text,
  administrador_telefono  text,
  propietario_nombre      text,
  propietario_telefono    text
)
language sql stable security definer set search_path = public, pg_temp
as $$
  select
    anfitrion.nombre,     anfitrion.telefono,
    administrador.nombre, administrador.telefono,
    propietario.nombre,   propietario.telefono
  from (select 1) _
  left join lateral (
    select m.nombre, m.telefono from public.membresia_unidad m
    where m.unidad_id = p_unidad_id and m.activo and m.es_anfitrion_primario
    limit 1
  ) anfitrion on true
  left join lateral (
    select m.nombre, m.telefono from public.membresia_unidad m
    where m.unidad_id = p_unidad_id and m.activo and m.es_admin_primario
    limit 1
  ) administrador on true
  left join lateral (
    select m.nombre, m.telefono from public.membresia_unidad m
    where m.unidad_id = p_unidad_id and m.activo and m.rol = 'propietario'
    limit 1
  ) propietario on true
  where public.puede_operar_unidad(p_unidad_id)
     or public.es_huesped_con_reserva(p_unidad_id);
$$;


-- ----------------------------------------------------------------------------
-- Se elimina el nombre viejo
-- ----------------------------------------------------------------------------
-- Dejarlo vivo seria dejar un tercer significado rondando. Si algo quedo sin
-- migrar, que falle aqui y no en silencio.
drop function if exists public.es_huesped_de_unidad(uuid);


-- El comentario de `es_miembro_unidad` apuntaba al nombre que acaba de
-- desaparecer. Se actualiza: un comentario que menciona algo inexistente es
-- peor que no tener comentario.
create or replace function public.es_miembro_unidad(p_unidad_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.membresia_unidad mu
    where mu.unidad_id = p_unidad_id
      and mu.usuario_id = auth.uid()
      and mu.activo
      -- El huesped temporal no. Lo suyo pasa por `es_huesped_con_reserva` o
      -- `es_huesped_alojado`, segun si el dato es del alojamiento o es una
      -- credencial de entrada.
      and mu.rol <> 'huesped_temporal'
  );
$$;
