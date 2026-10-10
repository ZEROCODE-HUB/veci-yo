-- El huesped abre su preregistro con el codigo de su reserva.
--
-- Aditiva: dos columnas, un indice y una funcion.
--
-- Decidido con el cliente el 09/10/2026. La reserva de Airbnb entra sola por
-- el calendario, pero el enlace del preregistro lo tenia que generar y mandar
-- el anfitrion a mano, reserva por reserva. Ahora el anfitrion pone **una vez**
-- en su mensaje automatico de Airbnb una direccion que termina en el codigo de
-- la reserva --`/r/HMABCD1234`--, y el huesped entra por ahi.
--
-- Un codigo de reserva no es un secreto: viaja en correos y capturas. Por eso
-- no basta: hay que dar tambien los **ultimos cuatro digitos del telefono**
-- con el que se reservo, que es lo unico del huesped que el calendario trae.
-- Y los intentos se cuentan.

alter table public.visita
  add column if not exists intentos_apertura smallint not null default 0,
  add column if not exists apertura_bloqueada_hasta timestamptz;

comment on column public.visita.intentos_apertura is
  'Cuantas veces seguidas se dieron mal los ultimos cuatro digitos al abrir '
  'el preregistro con el codigo de reserva. Vuelve a cero al acertar.';
comment on column public.visita.apertura_bloqueada_hasta is
  'Hasta cuando no se puede abrir con el codigo, tras cinco fallos seguidos.';

/*
  Un codigo, una estancia viva. Sin esto, dos filas con el mismo codigo harian
  que la funcion eligiera una al azar. En mayusculas porque el huesped lo
  puede teclear como quiera.
*/
create unique index if not exists visita_codigo_reserva_unico
  on public.visita (upper(codigo_reserva))
  where codigo_reserva is not null and deleted_at is null;

create or replace function public.abrir_precheckin_por_reserva(
  p_codigo   text,
  p_ultimos4 text
)
returns table (estado text, token text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_codigo  text := upper(btrim(coalesce(p_codigo, '')));
  v_dados   text := regexp_replace(coalesce(p_ultimos4, ''), '[^0-9]', '', 'g');
  v_visita  public.visita%rowtype;
  v_token   text;
begin
  if v_codigo = '' then
    return query select 'preparando'::text, null::text;
    return;
  end if;

  select v.* into v_visita
  from public.visita v
  where upper(v.codigo_reserva) = v_codigo
    and v.deleted_at is null
    and v.tipo = 'huesped_temporal'
    and v.estado <> 'cancelada'
  for update;

  /*
    «Preparando» y no «no existe»: el calendario se lee cada cierto tiempo, asi
    que una reserva recien hecha todavia no esta. Es tambien lo que se responde
    a un codigo inventado, para que esto no sirva para saber cuales existen.
  */
  if not found then
    return query select 'preparando'::text, null::text;
    return;
  end if;

  if v_visita.apertura_bloqueada_hasta is not null
     and v_visita.apertura_bloqueada_hasta > now() then
    return query select 'bloqueado'::text, null::text;
    return;
  end if;

  if v_visita.precheckin_completado_en is not null then
    return query select 'cerrado'::text, null::text;
    return;
  end if;

  /*
    Sin los cuatro digitos guardados no hay con que comprobar a nadie, y el
    codigo solo no basta. Esa reserva se abre con el enlace que manda el
    anfitrion, como hasta ahora.
  */
  if v_visita.telefono_ultimos4 is null then
    return query select 'sin_telefono'::text, null::text;
    return;
  end if;

  if v_dados <> v_visita.telefono_ultimos4 then
    if v_visita.intentos_apertura + 1 >= 5 then
      update public.visita
      set intentos_apertura = 0,
          apertura_bloqueada_hasta = now() + interval '1 hour'
      where id = v_visita.id;
      return query select 'bloqueado'::text, null::text;
    else
      update public.visita
      set intentos_apertura = intentos_apertura + 1
      where id = v_visita.id;
      return query select 'ultimos4_incorrectos'::text, null::text;
    end if;
    return;
  end if;

  /*
    Acerto. Se emite un enlace igual que el que genera el anfitrion: el token
    vive en claro solo en esta respuesta, en la base queda su sha256, y caduca
    con la estancia. El que hubiera antes deja de valer; lo ya rellenado no se
    pierde, porque esta en la estancia y no en el enlace.
  */
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  update public.visita
  set precheckin_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
      precheckin_expira_en = coalesce(v_visita.fecha_hasta + 1, current_date + 30)::timestamptz,
      intentos_apertura = 0,
      apertura_bloqueada_hasta = null
  where id = v_visita.id;

  return query select 'listo'::text, v_token;
end;
$$;

comment on function public.abrir_precheckin_por_reserva(text, text) is
  'El huesped abre su preregistro con el codigo de la reserva y los ultimos '
  'cuatro digitos del telefono con el que reservo. Cinco fallos seguidos lo '
  'bloquean una hora.';

grant execute on function public.abrir_precheckin_por_reserva(text, text)
  to anon, authenticated;

notify pgrst, 'reload schema';
