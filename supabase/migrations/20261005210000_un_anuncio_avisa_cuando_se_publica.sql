-- ----------------------------------------------------------------------------
-- Un anuncio avisa cuando se publica
-- ----------------------------------------------------------------------------
-- `motivo_notificacion` tiene el valor `anuncio_publicado` desde el 22/09/2026
-- y **nadie lo inserta**. Se publica un anuncio y ningun vecino recibe nada:
-- hay que entrar a mirar. Lo encontre al conectar las preferencias de aviso
-- --habia un interruptor para un aviso que no existe-- y el cliente lo
-- confirmo el 05/10/2026: «pues al publicar el anuncio debe notificarles, no?».
--
-- Es otra columna que existe y nadie escribe, la sexta contada.
--
-- ----------------------------------------------------------------------------
-- Tres decisiones, tomadas con el cliente
-- ----------------------------------------------------------------------------
--   1. **Avisar es opcional, por publicacion.** Vale igual para un anuncio y
--      para una encuesta: una casilla en el formulario. Pedido asi: «lo mejor
--      seria poder hacerlo parametrizable el tema de anuncio y votacion». Va
--      marcada por defecto, porque un anuncio del que nadie se entera no es un
--      anuncio.
--   2. **Nada de recordatorios antes de que cierre una encuesta.** Se ofrecio y
--      se descarto expresamente: «el recordatorio no, eso no parametrizable, o
--      sea no va». No se construye.
--   3. **La fecha de publicacion programa de verdad.** Hasta ese dia el anuncio
--      no se ve, y ese dia salen los avisos: «que programe de verdad, o obvio
--      la notificacion les llegara solo cuando se publique».
--
-- ----------------------------------------------------------------------------
-- Lo que la fecha de publicacion hacia hasta hoy: nada
-- ----------------------------------------------------------------------------
-- El formulario pide «Fecha de publicacion*» y la guarda en `publicada_desde`.
-- Y **nadie filtraba por ella**: ni `publicacion_lectura`, ni
-- `puede_ver_publicacion`, ni `obtenerAnuncios`, que solo ordena. Poner el
-- jueves y el anuncio se veia al momento de crearlo.
--
-- O sea: era un campo obligatorio que prometia programar y no programaba. La
-- novena casilla decorativa, con forma de fecha.
--
-- Ahora la audiencia --y la porteria-- solo ve lo ya publicado. La
-- administracion sigue viendo lo programado, porque si no, no podria ni
-- corregirlo ni borrarlo antes de que salga.
--
-- ----------------------------------------------------------------------------
-- «Programado» se mide por dias, y con el reloj del edificio
-- ----------------------------------------------------------------------------
-- La primera version comparaba `publicada_desde > now()`, y **no avisaba
-- nunca**: `crearAnuncio` manda `new Date()` del dispositivo, que iba 1,3
-- segundos por delante del servidor. O sea que «publicar ahora» quedaba en el
-- futuro y el aviso se quedaba esperando al cron del dia siguiente.
--
-- No es un detalle de la prueba: la fecha sale del **reloj del telefono de
-- quien publica**. Un movil un minuto adelantado --que es lo normal-- publica
-- un anuncio que no avisa, y quien lo publico no tiene forma de saber por que.
--
-- Asi que la comparacion es por **dia**, que es lo que el formulario pide de
-- verdad --`CampoFecha` elige una fecha, no una hora-- y en la zona horaria
-- del condominio, que es el reloj con el que cuentan el resto de las reglas de
-- este proyecto. Es la misma leccion que `reserva_no_en_el_pasado`, aplicada a
-- codigo de produccion en vez de a una prueba.
--
-- Lo que **no** se toca: `publicada_hasta`. Para una encuesta es cuando cierra
-- la votacion, y sus resultados se siguen leyendo despues; para un anuncio no
-- esta decidido que signifique. Esta anotado en REVISAR-A-OJO.
--
-- Aditiva.

alter table public.publicacion
  add column if not exists avisar boolean not null default true,
  add column if not exists avisado_en timestamptz;

comment on column public.publicacion.avisar is
  'Si al publicarse se avisa a su audiencia. Lo elige quien publica, anuncio o encuesta igual. Por defecto si: un anuncio del que nadie se entera no es un anuncio.';

comment on column public.publicacion.avisado_en is
  'Cuando salio el aviso. Es la constancia y es lo que evita avisar dos veces: la pasada diaria se salta lo que ya tiene fecha.';

create index if not exists publicacion_por_avisar_idx
  on public.publicacion (publicada_desde)
  where avisar and avisado_en is null and deleted_at is null;

-- ----------------------------------------------------------------------------
-- Si ya llego su dia
-- ----------------------------------------------------------------------------
-- En una funcion y no repetida en cuatro sitios: son la visibilidad, el aviso
-- al publicar, la pasada diaria y el indice. Cuatro sitios que comparan fechas
-- es el accidente conocido --«dos sitios que arman el mismo texto lo arman
-- distinto»-- y aqui significaria que se avisa de algo que todavia no se ve.

create or replace function public.ya_es_su_dia(
  p_publicada_desde timestamptz,
  p_condominio_id   uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select (p_publicada_desde at time zone public.zona_horaria_del_condominio(p_condominio_id))::date
      <= (now() at time zone public.zona_horaria_del_condominio(p_condominio_id))::date;
$fn$;

comment on function public.ya_es_su_dia is
  'Si la fecha de publicacion ya llego, contando por dias y con el reloj del edificio. Por dias porque el formulario elige una fecha, y con ese reloj porque la fecha la pone el telefono de quien publica: uno adelantado unos segundos dejaba «publicar ahora» en el futuro.';

revoke all on function public.ya_es_su_dia(timestamptz, uuid) from public;
grant execute on function public.ya_es_su_dia(timestamptz, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- A quien alcanza una publicacion
-- ----------------------------------------------------------------------------
-- Las tres condiciones son **las mismas** que `audiencia_alcanza` usa para
-- decidir si alguien la ve, copiadas de `es_propietario_en_condominio`,
-- `es_residente_en_condominio` y `es_huesped_del_condominio`.
--
-- Que esten en dos sitios es el riesgo conocido --«dos sitios que arman el
-- mismo texto lo arman distinto»-- y no se puede evitar: esas tres preguntan
-- por `auth.uid()`, o sea responden «yo si o no», y aqui hace falta la lista.
--
-- Lo que si se puede es comprobar que coinciden, y hay un caso de prueba que
-- lo hace: para una persona concreta, estar en esta lista y que
-- `audiencia_alcanza` diga si tienen que ser lo mismo. Si alguien cambia una y
-- no la otra, se pone rojo.

create or replace function public.quien_alcanza_la_publicacion(p_publicacion_id uuid)
returns table (usuario_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select distinct mu.usuario_id
  from public.publicacion p
  join public.unidad u on u.condominio_id = p.condominio_id
  join public.membresia_unidad mu on mu.unidad_id = u.id
  where p.id = p_publicacion_id
    and mu.usuario_id is not null
    and mu.activo
    -- Sin cuenta no hay bandeja. Es el menor de edad que el propietario
    -- registra, que a proposito no entra a la plataforma.
    and mu.puede_acceder
    and (
      (p.para_propietarios and mu.rol = 'propietario')
      or (p.para_residentes and mu.es_residente and mu.rol <> 'huesped_temporal')
      or (p.para_huespedes and mu.rol = 'huesped_temporal'
          and (mu.vigente_hasta is null or mu.vigente_hasta >= current_date))
    );
$fn$;

comment on function public.quien_alcanza_la_publicacion is
  'Las cuentas a las que llega una publicacion, por su audiencia. Las tres condiciones son las mismas que `audiencia_alcanza`, que responde lo mismo pero solo sobre quien pregunta. Interna.';

revoke execute on function public.quien_alcanza_la_publicacion(uuid)
  from public, anon, authenticated;
grant execute on function public.quien_alcanza_la_publicacion(uuid) to service_role;

-- ----------------------------------------------------------------------------
-- El aviso
-- ----------------------------------------------------------------------------

create or replace function public.avisar_de_la_publicacion(
  p_publicacion_id uuid,
  -- Una correccion de un anuncio que ya salio. Cambia el texto del aviso y no
  -- toca `avisado_en`, que es la constancia del primero.
  p_es_cambio boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_pub      record;
  v_titulo   text;
  v_cuantos  integer := 0;
begin
  select p.id, p.condominio_id, p.tipo, p.titulo, p.creada_por,
         p.avisar, p.avisado_en, p.publicada_desde, p.deleted_at
    into v_pub
  from public.publicacion p
  where p.id = p_publicacion_id;

  if v_pub.id is null or v_pub.deleted_at is not null then
    return 0;
  end if;

  -- Quien publico dijo que no. Se respeta tambien en el cambio: si no quiso
  -- avisar del anuncio, no se le avisa de la correccion.
  if not v_pub.avisar then
    return 0;
  end if;

  -- Todavia no toca. La pasada diaria volvera cuando llegue el dia.
  --
  -- Por dia y con el reloj del edificio, no por `> now()`: la fecha viene del
  -- reloj del telefono de quien publica, y uno adelantado unos segundos dejaba
  -- «publicar ahora» en el futuro. Ver la cabecera.
  if not public.ya_es_su_dia(v_pub.publicada_desde, v_pub.condominio_id) then
    return 0;
  end if;

  -- Ya se aviso. Sin esto, la pasada diaria repetiria el aviso cada dia.
  if not p_es_cambio and v_pub.avisado_en is not null then
    return 0;
  end if;

  v_titulo := case
    when p_es_cambio and v_pub.tipo = 'encuesta' then 'Cambió una encuesta'
    when p_es_cambio then 'Cambió un anuncio'
    when v_pub.tipo = 'encuesta' then 'Nueva encuesta'
    else 'Nuevo anuncio'
  end;

  /*
    `anuncio_publicado` para las cuatro cosas, y no un motivo nuevo por cada
    una: en la pantalla de avisos eso serian cuatro interruptores para decidir
    lo mismo. El titulo distingue; la eleccion es una.
  */
  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select q.usuario_id, v_pub.condominio_id, 'anuncio_publicado',
         v_titulo, v_pub.titulo, 'publicacion', v_pub.id
  from public.quien_alcanza_la_publicacion(p_publicacion_id) q
  where
    -- A quien lo publico, no. Ya lo sabe.
    (v_pub.creada_por is null or q.usuario_id <> v_pub.creada_por)
    -- Y a quien apago este motivo, tampoco. Sin esto la casilla seria
    -- decorativa, que es el defecto mas repetido de este proyecto.
    and public.quiere_aviso(q.usuario_id, 'anuncio_publicado', 'app');

  get diagnostics v_cuantos = row_count;

  if not p_es_cambio then
    update public.publicacion set avisado_en = now() where id = p_publicacion_id;
  end if;

  return v_cuantos;
end;
$fn$;

comment on function public.avisar_de_la_publicacion is
  'Avisa a la audiencia de una publicacion y devuelve a cuantos. No avisa si quien publico no quiso, si la fecha no ha llegado, o si ya se aviso. Respeta la preferencia de cada quien y no se avisa a si mismo.';

revoke execute on function public.avisar_de_la_publicacion(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.avisar_de_la_publicacion(uuid, boolean) to service_role;

-- ----------------------------------------------------------------------------
-- Al publicar, si ya toca
-- ----------------------------------------------------------------------------
-- `after insert` y no `before`: el aviso lee la fila --y las opciones de voto
-- se insertan despues-- asi que tiene que existir antes.

create or replace function public.publicacion_recien_puesta_avisa()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  -- La funcion decide: si la fecha es futura no hace nada y la pasada diaria
  -- vuelve el dia que toque. Aqui no se repite ese criterio.
  perform public.avisar_de_la_publicacion(new.id, false);
  return new;
end;
$fn$;

drop trigger if exists publicacion_avisa on public.publicacion;
create trigger publicacion_avisa
  after insert on public.publicacion
  for each row execute function public.publicacion_recien_puesta_avisa();

-- ----------------------------------------------------------------------------
-- Y las programadas, cuando llega su dia
-- ----------------------------------------------------------------------------
-- La segunda tarea periodica del proyecto. La primera son los recordatorios
-- del precheckin (`20261003220000`), y de ahi se copia la forma: la funcion
-- devuelve a cuantos avisó, para que se pueda mirar sin mandar nada.

create or replace function public.avisar_publicaciones_programadas()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_pub     record;
  v_total   integer := 0;
begin
  for v_pub in
    select p.id
    from public.publicacion p
    where p.avisar
      and p.avisado_en is null
      and p.deleted_at is null
      and public.ya_es_su_dia(p.publicada_desde, p.condominio_id)
    order by p.publicada_desde
  loop
    v_total := v_total + public.avisar_de_la_publicacion(v_pub.id, false);
  end loop;

  return v_total;
end;
$fn$;

comment on function public.avisar_publicaciones_programadas is
  'La pasada que avisa de las publicaciones cuya fecha ya llego. La llama el cron. Idempotente: `avisado_en` evita repetir.';

revoke execute on function public.avisar_publicaciones_programadas()
  from public, anon, authenticated;
grant execute on function public.avisar_publicaciones_programadas() to service_role;

/*
  A las 12:05 UTC, o sea las 07:05 en Colombia: un anuncio programado para hoy
  sale a primera hora, antes de que nadie lo busque. Los recordatorios del
  precheckin van a las 14:00 y no conviene juntarlos, para que un fallo de uno
  no arrastre al otro.
*/
select cron.unschedule('avisos-de-publicaciones')
where exists (select 1 from cron.job where jobname = 'avisos-de-publicaciones');

select cron.schedule(
  'avisos-de-publicaciones',
  '5 12 * * *',
  $cron$ select public.avisar_publicaciones_programadas(); $cron$
);

-- ----------------------------------------------------------------------------
-- La fecha de publicacion, por fin, programa
-- ----------------------------------------------------------------------------
-- La administracion ve lo programado --tiene que poder corregirlo antes de que
-- salga-- y la audiencia y la porteria, no.

create or replace function public.puede_ver_publicacion_fila(
  p_condominio_id     uuid,
  p_para_propietarios boolean,
  p_para_residentes   boolean,
  p_para_huespedes    boolean,
  p_publicada_desde   timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select
    -- Quien administra, siempre: tambien lo que todavia no ha salido.
    public.puede_coadmin(p_condominio_id, 'visualizarEncuestas')
    or (
      public.ya_es_su_dia(p_publicada_desde, p_condominio_id)
      and (
        public.audiencia_alcanza(
          p_condominio_id, p_para_propietarios, p_para_residentes, p_para_huespedes)
        or public.es_guardia_de_condominio(p_condominio_id)
      )
    );
$fn$;

comment on function public.puede_ver_publicacion_fila is
  'Quien ve una publicacion, evaluado sobre sus columnas. Sobre las columnas y no volviendo a buscar la fila, por lo que ya paso con `conversacion`: una funcion `stable` no ve la fila que el mismo INSERT esta escribiendo, asi que un alta con RETURNING se rechazaba.';

revoke all on function public.puede_ver_publicacion_fila(
  uuid, boolean, boolean, boolean, timestamptz) from public;
grant execute on function public.puede_ver_publicacion_fila(
  uuid, boolean, boolean, boolean, timestamptz) to authenticated;

drop policy if exists publicacion_lectura on public.publicacion;
create policy publicacion_lectura on public.publicacion
  for select to authenticated
  using (
    public.puede_ver_publicacion_fila(
      condominio_id, para_propietarios, para_residentes, para_huespedes,
      publicada_desde)
  );

-- La de un argumento --que usan `opcion_voto`, `voto` y los adjuntos-- pasa a
-- apoyarse en la nueva, para que la regla viva en un solo sitio.
create or replace function public.puede_ver_publicacion(p_publicacion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce((
    select public.puede_ver_publicacion_fila(
      p.condominio_id, p.para_propietarios, p.para_residentes,
      p.para_huespedes, p.publicada_desde)
    from public.publicacion p
    where p.id = p_publicacion_id and p.deleted_at is null
  ), false);
$fn$;

-- ----------------------------------------------------------------------------
-- Corregir un anuncio ya publicado
-- ----------------------------------------------------------------------------
-- No se podia. `publicacion` **si** tiene politica de UPDATE desde el primer
-- dia --`publicacion_cambio`, con `es_admin_condominio`-- y ninguna pantalla la
-- usaba: un anuncio se publicaba y se borraba, no se corregia. Es el reverso
-- de la columna que nadie escribe: aqui el permiso existia y nadie lo gastaba.
--
-- El cliente eligio avisar del cambio **solo si se pide**: «una falta de
-- ortografia no suena, y un cambio de hora si».
--
-- Lo que NO se puede cambiar: las opciones de una votacion. Cambiarlas con
-- votos ya emitidos convertiria el recuento en una mentira --los votos apuntan
-- a `opcion_voto` por su id-- y no hay forma honesta de reinterpretarlos. Si
-- hay que cambiarlas, se cierra esa encuesta y se abre otra.

create or replace function public.corregir_publicacion(
  p_publicacion_id   uuid,
  p_titulo           text,
  -- Con `default null` los tres: null significa «no lo cambies», y asi la
  -- pantalla puede mandar solo lo que toco.
  p_descripcion      text default null,
  p_url_video        text default null,
  p_publicada_desde  timestamptz default null,
  p_publicada_hasta  timestamptz default null,
  p_para_propietarios boolean default null,
  p_para_residentes   boolean default null,
  p_para_huespedes    boolean default null,
  p_avisar_del_cambio boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_avisados integer := 0;
  v_condominio uuid;
begin
  if coalesce(btrim(p_titulo), '') = '' then
    raise exception 'El anuncio necesita un titulo';
  end if;

  /*
    `security definer` por necesidad, y el permiso comprobado aqui.

    La primera version era `invoker`, para que decidiera la politica
    `publicacion_cambio`. Y fallaba con «permission denied for function
    avisar_de_la_publicacion»: el aviso es interno --no se concede a nadie, o
    cualquiera podria mandar notificaciones con el texto que quisiera-- asi que
    una funcion `invoker` no puede llamarlo.

    La comprobacion es **la misma** que la politica: `es_admin_condominio`.
  */
  select p.condominio_id into v_condominio
  from public.publicacion p
  where p.id = p_publicacion_id and p.deleted_at is null;

  if v_condominio is null then
    raise exception 'Ese anuncio no existe'
      using errcode = 'no_data_found';
  end if;

  if not public.es_admin_condominio(v_condominio) then
    raise exception 'Solo la administracion del edificio corrige sus anuncios'
      using errcode = 'insufficient_privilege';
  end if;

  -- Los `coalesce` dejan pasar lo que no se manda, para que corregir el titulo
  -- no borre la audiencia.
  update public.publicacion p
  set titulo            = btrim(p_titulo),
      descripcion       = coalesce(p_descripcion, p.descripcion),
      url_video         = coalesce(p_url_video, p.url_video),
      publicada_desde   = coalesce(p_publicada_desde, p.publicada_desde),
      publicada_hasta   = coalesce(p_publicada_hasta, p.publicada_hasta),
      para_propietarios = coalesce(p_para_propietarios, p.para_propietarios),
      para_residentes   = coalesce(p_para_residentes, p.para_residentes),
      para_huespedes    = coalesce(p_para_huespedes, p.para_huespedes)
  where p.id = p_publicacion_id;

  if p_avisar_del_cambio then
    v_avisados := public.avisar_de_la_publicacion(p_publicacion_id, true);
  end if;

  return v_avisados;
end;
$fn$;

comment on function public.corregir_publicacion is
  'Corrige un anuncio o una encuesta y, si se pide, avisa del cambio. `security definer` porque el aviso es interno y una funcion invoker no puede llamarlo; comprueba `es_admin_condominio`, que es lo mismo que exige la politica. No toca las opciones de una votacion: cambiarlas con votos emitidos convertiria el recuento en una mentira.';

revoke all on function public.corregir_publicacion(
  uuid, text, text, text, timestamptz, timestamptz,
  boolean, boolean, boolean, boolean) from public;
grant execute on function public.corregir_publicacion(
  uuid, text, text, text, timestamptz, timestamptz,
  boolean, boolean, boolean, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- Lo que ya estaba publicado no avisa de golpe
-- ----------------------------------------------------------------------------
-- Las ocho publicaciones que hay son de septiembre y octubre. Sin esto, la
-- primera pasada del cron mandaria ocho avisos de anuncios viejos a todo el
-- edificio. Se marcan como ya avisadas, que es la verdad desde el punto de
-- vista de quien los lee: ya los vio o ya no le interesan.

update public.publicacion
set avisado_en = coalesce(avisado_en, publicada_desde)
where avisado_en is null and deleted_at is null;
