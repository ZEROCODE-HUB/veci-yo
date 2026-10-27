-- ----------------------------------------------------------------------------
-- La reserva se abre solo con su código (27/10/2026)
-- ----------------------------------------------------------------------------
-- Hueco 48 del GSheet. Para entrar al preregistro desde el mensaje de Airbnb
-- (`/r/<código>`) se pedían además los cuatro últimos dígitos del teléfono, y
-- tras cinco fallos la reserva se bloqueaba una hora. El cliente: «no tiene
-- sentido, que se muestre y ya».
--
-- Ahora basta el código de confirmación de la reserva, que es largo y no se
-- adivina (los de Airbnb tienen diez caracteres). Lo que no cambia: un código
-- que no existe responde «preparando», igual que una reserva recién hecha,
-- para que esto no sirva para averiguar cuáles existen; y una reserva con el
-- preregistro cerrado no se vuelve a abrir.
--
-- `abrir_precheckin_por_reserva(text, text)` se queda, ignorando los dígitos,
-- para la web que todavía lo llame hasta que se publique la nueva. Solo aditiva.

create or replace function public.abrir_precheckin_por_reserva(p_codigo text)
returns table(estado text, token text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_codigo  text := upper(btrim(coalesce(p_codigo, '')));
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

  if not found then
    return query select 'preparando'::text, null::text;
    return;
  end if;

  if v_visita.precheckin_completado_en is not null then
    return query select 'cerrado'::text, null::text;
    return;
  end if;

  /*
    Se emite un enlace igual que el que genera el anfitrión: el token vive en
    claro solo en esta respuesta, en la base queda su sha256, y caduca con la
    estancia. El que hubiera antes deja de valer; lo ya rellenado no se
    pierde, porque está en la estancia y no en el enlace.
  */
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  update public.visita
  set precheckin_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
      precheckin_expira_en = public.vencimiento_del_preregistro(v_visita.id),
      intentos_apertura = 0,
      apertura_bloqueada_hasta = null
  where id = v_visita.id;

  return query select 'listo'::text, v_token;
end;
$function$;

comment on function public.abrir_precheckin_por_reserva(text) is
  'Abre el preregistro de una estancia con su código de reserva (la puerta /r/<código> del mensaje de Airbnb) y devuelve un enlace nuevo. Un código que no existe responde «preparando». Hueco 48, 27/10/2026.';

grant execute on function public.abrir_precheckin_por_reserva(text) to anon, authenticated, service_role;

create or replace function public.abrir_precheckin_por_reserva(p_codigo text, p_ultimos4 text)
returns table(estado text, token text)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select * from public.abrir_precheckin_por_reserva(p_codigo);
$function$;

comment on function public.abrir_precheckin_por_reserva(text, text) is
  'La versión de antes del 27/10/2026, que pedía los cuatro últimos dígitos del teléfono: ya no los mira. Se queda para la web publicada hasta que llame a la de un argumento.';
