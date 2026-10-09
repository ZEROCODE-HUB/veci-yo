-- La reserva guarda cuántos de los que vienen son menores
--
-- Continuación de `20261009160000`, que guardó el total. El anfitrión elige
-- «2 personas, 1 menor» y lo segundo seguía tirándose: la ficha del menor
-- **no se crea** --los acompañantes sin nombre no se crean, porque los rellena
-- el huésped desde su enlace-- así que no quedaba rastro de que uno de los dos
-- tiene que serlo.
--
-- Lo vio el cliente el 09/10/2026 reservando para dos: la tarjeta decía «1»,
-- y al preguntar por qué salió que del «1 menor» no quedaba nada. Eligió esta
-- vía sobre la otra --crear fichas vacías ya marcadas-- porque no inventa
-- personas y no obliga al huésped a borrar las que sobren.
--
-- Aditiva: una columna, una restricción y una función reemplazada.

alter table public.visita
  add column if not exists menores_previstos int;

comment on column public.visita.menores_previstos is
  'Cuantos de los `huespedes_previstos` dijo el anfitrion que son menores de '
  'edad. Es una **expectativa**, no un hecho: quien es menor lo decide la '
  'fecha de nacimiento de cada ficha, que pone el huesped en su preregistro. '
  'Sirve para que el enlace pueda decir «de estas 2 personas, 1 tiene que ser '
  'menor» en vez de perder lo que el anfitrion configuro.';

alter table public.visita
  drop constraint if exists visita_menores_previstos_coherente;

/*
  Nunca negativo, y nunca todos: **el titular no puede ser menor** --lo exige
  `cerrar_precheckin` desde el 03/10/2026-- asi que con un total declarado
  tiene que quedar al menos un adulto. Sin total declarado solo se comprueba
  que no sea negativo, que es todo lo que se puede afirmar.
*/
alter table public.visita
  add constraint visita_menores_previstos_coherente
  check (
    menores_previstos is null
    or (
      menores_previstos >= 0
      and (
        huespedes_previstos is null
        or menores_previstos < huespedes_previstos
      )
    )
  )
  not valid;

-- Se valida aqui mismo: una `NOT VALID` que nadie valida nunca es una bomba
-- con temporizador, y que esto pase es la prueba de que no hay filas malas.
alter table public.visita
  validate constraint visita_menores_previstos_coherente;

-- ============================================================================
-- El enlace del huésped lo necesita saber
-- ============================================================================
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
  menores_previstos integer,
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
    v.menores_previstos,
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
  'token del enlace. Desde el 09/10/2026 dice tambien cuantas personas caben, '
  'cuantas hay y cuantas se esperan menores.';

grant execute on function public.consultar_precheckin(text) to anon, authenticated;
