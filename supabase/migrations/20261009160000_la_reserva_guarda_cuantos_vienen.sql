-- La reserva guarda cuántos vienen
--
-- El anfitrión elige «3 personas, 1 menor» en el alta de la estancia, y ese
-- número **se tiraba**: `crearVisita` recibe `invitados`, una fila por cada
-- acompañante al que el anfitrión le puso nombre, y nada más. El total no
-- tenía columna.
--
-- Consecuencia, que la vio el cliente el 09/10/2026 abriendo su propio enlace:
-- «me dejó agregar más huéspedes de los que había configurado en la reserva
-- como anfitrión». El tope que sí funciona es `max_huespedes` --el aforo del
-- alojamiento, 4 en la 102-- así que con una reserva para una persona se
-- podían meter tres más.
--
-- Es «una decisión de producto escondida en una variable que se tira», de las
-- que ya salieron tres al encender el linter: el formulario pregunta algo, la
-- persona responde, y la respuesta no llega a ninguna parte.
--
-- Aditiva: una columna, una restricción y dos funciones reemplazadas. No borra
-- nada; las estancias que ya existen se quedan sin el dato y entonces manda el
-- aforo, que es como funcionaba hasta hoy.

-- ============================================================================
-- 1. La columna
-- ============================================================================

alter table public.visita
  add column if not exists huespedes_previstos int;

comment on column public.visita.huespedes_previstos is
  'Cuantas personas dijo el anfitrion que vienen, **contando al titular**. Es '
  'el tope de esta reserva; el del alojamiento es `max_huespedes` y manda el '
  'mas estricto de los dos. Nulo en lo anterior al 09/10/2026 y en lo que '
  'entra por el calendario de Airbnb, que no lo manda: entonces solo limita '
  'el aforo.';

alter table public.visita
  drop constraint if exists visita_huespedes_previstos_positivo;

alter table public.visita
  add constraint visita_huespedes_previstos_positivo
  check (huespedes_previstos is null or huespedes_previstos >= 1)
  not valid;

-- Se valida aqui mismo. Una restriccion `NOT VALID` que nadie valida nunca es
-- una bomba con temporizador --ya mordio con el `codigo_pais` de Sofia-- y que
-- esto pase es la prueba de que no queda ninguna fila mala.
alter table public.visita
  validate constraint visita_huespedes_previstos_positivo;

-- ============================================================================
-- 2. El tope de verdad es el más estricto de los dos
-- ============================================================================
-- `guardar_acompanante` ya miraba `max_huespedes`. Ahora mira tambien lo que
-- dijo el anfitrion y se queda con el menor: el aforo es del piso y no cambia,
-- y lo previsto es de esta reserva.
--
-- El mensaje dice **cual** de los dos topes se alcanzo, porque los arreglos
-- son distintos: uno lo cambia el anfitrion en la reserva y el otro en la
-- configuracion del alojamiento. Un «no caben mas» a secas deja al huesped
-- escribiendole a alguien sin saber que pedirle.

create or replace function public.tope_de_personas(p_visita_id uuid)
returns table (tope int, es_de_la_reserva boolean)
language sql
stable
as $$
  select
    least(v.huespedes_previstos, s.max_huespedes),
    /*
      De quien es el limite que manda. Con los dos puestos gana el menor; con
      empate se dice que es el de la reserva, que es el que el anfitrion puede
      cambiar en un momento.
    */
    v.huespedes_previstos is not null
      and (s.max_huespedes is null
           or v.huespedes_previstos <= s.max_huespedes)
  from public.visita v
  left join public.suscripcion_renta_corta s on s.unidad_id = v.unidad_id
  where v.id = p_visita_id;
$$;

comment on function public.tope_de_personas(uuid) is
  'Cuantas personas caben en una estancia y de donde sale el limite: lo '
  'previsto por el anfitrion o el aforo del alojamiento, el mas estricto.';

revoke all on function public.tope_de_personas(uuid) from public, anon;
grant execute on function public.tope_de_personas(uuid) to service_role;

-- ============================================================================
-- 3. La estancia dice cuántos caben, para que la pantalla no tenga que sumar
-- ============================================================================
-- `consultar_precheckin` devolvia `max_huespedes` y la web pintaba con eso. Se
-- le añade lo previsto y cuantos hay ya: sin el segundo, la pantalla tiene que
-- contar por su cuenta y entonces el limite vive en dos sitios.
--
-- Cambia el tipo de retorno, asi que hay que borrarla y crearla: `create or
-- replace` no puede cambiar las columnas que devuelve.

drop function if exists public.consultar_precheckin(text);

create function public.consultar_precheckin(p_token text)
returns table (
  visita_id uuid,
  condominio text,
  unidad text,
  anfitrion text,
  fecha_desde date,
  fecha_hasta date,
  max_huespedes integer,
  huespedes_previstos integer,
  personas_ya int,
  vigente boolean,
  completado boolean
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    v.id,
    c.nombre,
    u.codigo,
    -- El nombre de pila del anfitrion, para que el huesped sepa que el enlace
    -- es de quien le alquilo. El apellido y el correo no hacen falta aqui.
    split_part(coalesce(p.nombre, ''), ' ', 1),
    v.fecha_desde,
    v.fecha_hasta,
    s.max_huespedes,
    v.huespedes_previstos,
    (select count(*)::int from public.invitado i where i.visita_id = v.id),
    (v.precheckin_expira_en > now()),
    (v.precheckin_completado_en is not null)
  from public.visita v
  join public.unidad u on u.id = v.unidad_id
  join public.condominio c on c.id = v.condominio_id
  left join public.suscripcion_renta_corta s on s.unidad_id = v.unidad_id
  left join public.membresia_unidad m
         on m.unidad_id = v.unidad_id and m.rol = 'propietario' and m.activo
  left join public.perfil p on p.id = m.usuario_id
  where v.precheckin_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  limit 1;
$$;

comment on function public.consultar_precheckin(text) is
  'Lo que se puede saber de una estancia **antes** de identificarse, con el '
  'token del enlace. Desde el 09/10/2026 dice tambien cuantas personas caben '
  'y cuantas hay, para que la pantalla no tenga que contarlas por su cuenta.';

grant execute on function public.consultar_precheckin(text) to anon, authenticated;
