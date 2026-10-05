-- ----------------------------------------------------------------------------
-- Cada vecino elige por donde le avisan
-- ----------------------------------------------------------------------------
-- El cliente lo pidio el 02/10/2026: «WhatsApp configurable por residente y
-- por tipo de aviso». Y esta en el alcance del proyecto desde el principio:
-- el KT nombra «integracion WhatsApp» entre las de notificaciones, marcada
-- como no verificada en codigo. No lo estaba: no hay nada.
--
-- Hoy hay una sola bandeja --`notificacion`, que es la campana de la
-- aplicacion-- y ninguna eleccion. El unico ajuste parecido es
-- `perfil.usar_contacto_alt`, que dice **a que direccion** escribir y no **por
-- donde** ni **de que**.
--
-- ----------------------------------------------------------------------------
-- Una fila por lo que se aparta de lo normal, no por cada combinacion
-- ----------------------------------------------------------------------------
-- Ocho motivos por cada persona serian ocho filas para todo el mundo desde el
-- primer dia, y habria que escribirlas al dar de alta a cada quien --y
-- acordarse de añadirlas el dia que se añada un motivo--. Es el mismo problema
-- que la pertenencia a un canal, y la misma respuesta: lo que no esta escrito
-- se deduce.
--
-- Asi que la tabla guarda solo lo que alguien cambio, y `avisos_de_cada_uno`
-- devuelve los ocho motivos con lo que de verdad aplica.
--
-- ----------------------------------------------------------------------------
-- Lo que NO se puede apagar
-- ----------------------------------------------------------------------------
-- `sos_activado` es la alarma que reciben los guardias de turno. Un aviso de
-- panico que se puede silenciar no es una alarma, asi que ese motivo no entra
-- en la tabla: lo rechaza un `check`. Si alguna vez hay que poder, sera una
-- decision del cliente y no un descuido.
--
-- ----------------------------------------------------------------------------
-- Lo que falta para que WhatsApp llegue a alguna parte
-- ----------------------------------------------------------------------------
-- **Nada de esto manda un WhatsApp.** Hace falta una cuenta de WhatsApp
-- Business API --o un intermediario como Twilio-- y sus credenciales, que no
-- existen todavia; igual que el correo, que tampoco sale porque no hay SMTP
-- propio.
--
-- Lo que si queda es la eleccion, guardada y respetada por quien avise. Es
-- deliberado y es lo contrario de una casilla decorativa: la casilla **se
-- guarda y se lee**, y el dia que haya credenciales lo unico que falta es el
-- envio. Lo que no se hace es enseñar un interruptor de WhatsApp a quien no ha
-- dado un telefono: eso lo sujeta un disparador.
--
-- Aditiva.

create table if not exists public.preferencia_aviso (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  motivo        public.motivo_notificacion not null,

  -- La campana de la aplicacion. Se puede apagar: quien no quiere saber de un
  -- paquete hasta llegar a casa, no quiere.
  por_app       boolean not null default true,
  por_correo    boolean not null default false,
  por_whatsapp  boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint preferencia_aviso_una_por_motivo unique (usuario_id, motivo),

  -- La alarma de panico no se configura. Ver arriba.
  constraint preferencia_aviso_no_el_sos
    check (motivo <> 'sos_activado')
);

comment on table public.preferencia_aviso is
  'Por donde quiere cada persona que le avisen de cada cosa. Solo hay fila para lo que se aparta de lo normal; el resto lo deduce `avisos_de_cada_uno`. `sos_activado` no entra: una alarma de panico que se silencia no es una alarma.';

comment on column public.preferencia_aviso.por_whatsapp is
  'Se guarda y se respeta, pero **todavia no se manda nada**: falta la cuenta de WhatsApp Business API y sus credenciales. Igual que el correo, que espera un SMTP propio.';

create index if not exists preferencia_aviso_usuario_idx
  on public.preferencia_aviso (usuario_id);

drop trigger if exists preferencia_aviso_tocar_updated_at on public.preferencia_aviso;
create trigger preferencia_aviso_tocar_updated_at
  before update on public.preferencia_aviso
  for each row execute function public.tocar_updated_at();

-- ----------------------------------------------------------------------------
-- Sin telefono no hay WhatsApp
-- ----------------------------------------------------------------------------
-- En un disparador porque el dato esta en otra tabla y un `check` no puede
-- mirarla. Sin esto, alguien enciende WhatsApp, se queda tan tranquilo, y el
-- aviso no sale nunca sin que nada lo diga: es la forma de «una pantalla que
-- anuncia lo que no intento».

create or replace function public.whatsapp_necesita_telefono()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_tiene boolean;
begin
  if not new.por_whatsapp then
    return new;
  end if;

  select coalesce(
           btrim(coalesce(case when p.usar_contacto_alt then p.telefono_alt end,
                          p.telefono, '')) <> '',
           false)
    into v_tiene
  from public.perfil p
  where p.id = new.usuario_id;

  if not coalesce(v_tiene, false) then
    raise exception 'Para recibir avisos por WhatsApp hace falta un telefono en el perfil'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

comment on function public.whatsapp_necesita_telefono is
  'Encender WhatsApp sin telefono dejaria el aviso sin destino y nadie se enteraria. Mira el alternativo si la persona pidio usar el alternativo, que es lo que hace `usar_contacto_alt`.';

drop trigger if exists preferencia_aviso_whatsapp_con_telefono on public.preferencia_aviso;
create trigger preferencia_aviso_whatsapp_con_telefono
  before insert or update on public.preferencia_aviso
  for each row execute function public.whatsapp_necesita_telefono();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
-- Es de cada quien y de nadie mas. Ni la administracion: por donde quiere un
-- vecino que le avisen no es asunto del edificio.

alter table public.preferencia_aviso enable row level security;

drop policy if exists preferencia_aviso_propia on public.preferencia_aviso;
create policy preferencia_aviso_propia on public.preferencia_aviso
  for all to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

comment on policy preferencia_aviso_propia on public.preferencia_aviso is
  'Solo su dueño. La administracion no lo lee: por donde quiere alguien que le avisen no es un dato del edificio.';

-- ----------------------------------------------------------------------------
-- Los ocho motivos, con lo que de verdad aplica
-- ----------------------------------------------------------------------------
-- La pantalla no tiene que saber cuales son los valores por defecto ni cuales
-- motivos no se configuran: pide la lista y la pinta.

create or replace function public.avisos_de_cada_uno()
returns table (
  motivo       public.motivo_notificacion,
  por_app      boolean,
  por_correo   boolean,
  por_whatsapp boolean,
  configurable boolean
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $fn$
  select
    m.motivo,
    coalesce(p.por_app, true),
    coalesce(p.por_correo, false),
    coalesce(p.por_whatsapp, false),
    m.motivo <> 'sos_activado'
  from (
    select unnest(enum_range(null::public.motivo_notificacion)) as motivo
  ) m
  left join public.preferencia_aviso p
    on p.motivo = m.motivo and p.usuario_id = auth.uid()
  order by m.motivo;
$fn$;

comment on function public.avisos_de_cada_uno is
  'Los motivos de aviso que hay y por donde quiere cada uno recibirlos, con los valores por defecto ya aplicados. `configurable` en falso es la alarma de panico, que no se apaga.';

revoke all on function public.avisos_de_cada_uno() from public;
grant execute on function public.avisos_de_cada_uno() to authenticated;

-- ----------------------------------------------------------------------------
-- Guardar
-- ----------------------------------------------------------------------------

create or replace function public.guardar_aviso(
  p_motivo       public.motivo_notificacion,
  p_por_app      boolean,
  p_por_correo   boolean,
  p_por_whatsapp boolean
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
begin
  -- `security invoker`: la politica exige `usuario_id = auth.uid()`, asi que
  -- nadie guarda las preferencias de otro.
  insert into public.preferencia_aviso
    (usuario_id, motivo, por_app, por_correo, por_whatsapp)
  values
    (auth.uid(), p_motivo, p_por_app, p_por_correo, p_por_whatsapp)
  on conflict (usuario_id, motivo) do update
    set por_app      = excluded.por_app,
        por_correo   = excluded.por_correo,
        por_whatsapp = excluded.por_whatsapp;

  return true;
end;
$fn$;

comment on function public.guardar_aviso is
  'Guarda por donde quiere esta persona que le avisen de un motivo. El `check` de la tabla rechaza `sos_activado` y el disparador rechaza WhatsApp sin telefono.';

revoke all on function public.guardar_aviso(
  public.motivo_notificacion, boolean, boolean, boolean) from public;
grant execute on function public.guardar_aviso(
  public.motivo_notificacion, boolean, boolean, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- Y quien avise, que lo respete
-- ----------------------------------------------------------------------------
-- La casilla la tiene que **mirar** alguien, o es decorativa. Lo que inserta
-- en `notificacion` hoy son disparadores repartidos; esta funcion es la que
-- tienen que preguntar, y la que usara el envio de correo y de WhatsApp
-- cuando existan.

create or replace function public.quiere_aviso(
  p_usuario_id uuid,
  p_motivo     public.motivo_notificacion,
  p_canal      text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select case
    -- La alarma de panico va siempre y por todo lo que haya.
    when p_motivo = 'sos_activado' then true
    when p_canal = 'app' then coalesce(
      (select p.por_app from public.preferencia_aviso p
       where p.usuario_id = p_usuario_id and p.motivo = p_motivo), true)
    when p_canal = 'correo' then coalesce(
      (select p.por_correo from public.preferencia_aviso p
       where p.usuario_id = p_usuario_id and p.motivo = p_motivo), false)
    when p_canal = 'whatsapp' then coalesce(
      (select p.por_whatsapp from public.preferencia_aviso p
       where p.usuario_id = p_usuario_id and p.motivo = p_motivo), false)
    -- Un canal que no existe no recibe nada. Mejor que `true`: un error de
    -- escritura en el nombre no debe convertirse en avisar por todas partes.
    else false
  end;
$fn$;

comment on function public.quiere_aviso is
  'Si hay que avisar a esta persona de este motivo por este canal. Interna: no comprueba quien pregunta --la llaman los disparadores que insertan en `notificacion`-- asi que no se concede a nadie.';

revoke execute on function public.quiere_aviso(uuid, public.motivo_notificacion, text)
  from public, anon, authenticated;

grant execute on function public.quiere_aviso(uuid, public.motivo_notificacion, text)
  to service_role;

-- ----------------------------------------------------------------------------
-- Los dos sitios que avisan, mirando la casilla
-- ----------------------------------------------------------------------------
-- Sin esto `por_app` seria la novena casilla decorativa del proyecto. Los
-- puntos que insertan en `notificacion` son estos:
--
--   · `notificar_unidad`, que reparte a la vivienda --correspondencia,
--     reservas y la entrada de una visita--;
--   · `notificar_reconocimiento`, que avisa a quien recibe uno;
--   · y el SOS, que no se toca a proposito.
--
-- Las dos primeras pasan a preguntar. Mantienen su firma y su contrato: lo
-- unico que cambia es que dejan fuera a quien dijo que no.
--
-- `anuncio_publicado` existe en el enum y **no lo inserta nadie**: publicar un
-- anuncio no avisa a nadie hoy. Es otra columna que existe y nadie escribe, no
-- se arregla aqui, y queda anotado en REVISAR-A-OJO.

create or replace function public.notificar_unidad(
  p_unidad_id      uuid,
  p_tipo           public.motivo_notificacion,
  p_titulo         text,
  p_mensaje        text,
  p_entidad_tipo   text DEFAULT NULL,
  p_entidad_id     uuid DEFAULT NULL,
  p_excepto        uuid DEFAULT NULL,
  p_solo_residentes boolean DEFAULT false
)
returns void
language sql
security definer
set search_path to 'public', 'pg_temp'
as $fn$
  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  select distinct m.usuario_id, u.condominio_id, p_tipo, p_titulo, p_mensaje,
         p_entidad_tipo, p_entidad_id
  from public.membresia_unidad m
  join public.unidad u on u.id = m.unidad_id
  where m.unidad_id = p_unidad_id
    and m.activo
    and m.puede_acceder
    and m.usuario_id is not null
    and (p_excepto is null or m.usuario_id <> p_excepto)
    and (not p_solo_residentes or m.rol <> 'huesped_temporal')
    -- Quien apago este motivo en la campana no recibe la fila. No se inserta
    -- y se marca leida: no se inserta.
    and public.quiere_aviso(m.usuario_id, p_tipo, 'app');
$fn$;

comment on function public.notificar_unidad(uuid, public.motivo_notificacion, text, text, text, uuid, uuid, boolean) is
  'Avisa a los miembros de la vivienda que quieren saber de ese motivo. Con p_solo_residentes deja fuera al huesped temporal, para lo que es del hogar y no de su estancia.';


create or replace function public.notificar_reconocimiento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  v_insignia text;
begin
  if not public.quiere_aviso(new.usuario_id, 'reconocimiento_recibido', 'app') then
    return new;
  end if;

  select i.etiqueta into v_insignia
  from public.insignia i where i.id = new.insignia_id;

  insert into public.notificacion
    (usuario_id, condominio_id, tipo, titulo, mensaje, entidad_tipo, entidad_id)
  values (new.usuario_id, new.condominio_id, 'reconocimiento_recibido',
          'Recibiste un reconocimiento',
          'Un vecino te reconoció como "' || coalesce(v_insignia, 'buen vecino') || '".',
          'reconocimiento', new.id);
  return new;
end;
$fn$;

comment on function public.notificar_reconocimiento is
  'No dice quien lo otorgo: el reconocimiento entre vecinos no se firma de cara al destinatario. Y respeta la casilla de quien lo recibe.';
