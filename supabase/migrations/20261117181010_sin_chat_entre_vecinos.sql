-- Sin chat entre vecinos (17/11/2026, pedido del cliente: «no habilitar chats
-- entre vecinos»). El chat de cada vivienda con la portería y con la
-- administración se queda como está.
--
-- Qué había hoy de vecino a vecino:
--   · conversaciones `directa`: la política `conversacion_alta` no las deja
--     crear a nadie desde el 07/10/2026; solo nacen por
--     `abrir_chat_con_la_oficina`, que es de la administración con su oficina;
--   · los canales del edificio (`grupo`: «Residentes», «Propietarios»...),
--     donde cualquier vecino del canal escribe y lo leen todos los demás. Ese
--     es el chat entre vecinos que quedaba.
--
-- Ahora es un ajuste del edificio, `condominio.chat_entre_vecinos`, apagado
-- por defecto. Apagado:
--   · en un canal solo escribe el personal del edificio (administración,
--     coadministración, portería); los vecinos lo leen. Así el canal sirve
--     para que la administración avise, y no para conversar entre vecinos;
--   · una conversación `directa` solo la abre la administración.
-- Lo hace cumplir la base con disparadores (y no solo la pantalla), con un
-- mensaje que se entiende en vez del «violates row-level security» de una
-- política: la app vieja que lo intente lee el motivo.

-- 1. El ajuste.
alter table public.condominio
  add column if not exists chat_entre_vecinos boolean not null default false;

comment on column public.condominio.chat_entre_vecinos is
  'Si los vecinos pueden escribirse entre sí en los canales del chat del edificio (17/11/2026). Viene apagado: el cliente pidió no habilitar chats entre vecinos. Apagado, en un canal (conversacion tipo grupo) solo escribe el personal del edificio y una conversación directa solo la abre la administración. El chat de cada vivienda con la portería y la administración no depende de esto.';

-- 2. Quién escribe en una conversación, además de poder verla.
create or replace function public.puede_escribir_en_conversacion(p_conversacion_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce((
    select case
      when c.tipo = 'grupo' then
        coalesce(co.chat_entre_vecinos, false)
        or public.es_personal_condominio(c.condominio_id)
      else true
    end
    from public.conversacion c
    left join public.condominio co on co.id = c.condominio_id
    where c.id = p_conversacion_id
  ), false);
$function$;

comment on function public.puede_escribir_en_conversacion(uuid) is
  'Si quien llama puede escribir en esa conversación según el ajuste chat_entre_vecinos del edificio (17/11/2026). No mira si la ve: eso lo dice puede_ver_conversacion. La app la usa para quitar la caja de escribir; la base la aplica en el disparador mensaje_sin_chat_entre_vecinos.';

grant execute on function public.puede_escribir_en_conversacion(uuid) to authenticated;

-- 3. Los mensajes: en un canal, solo el personal si el edificio no lo abre.
create or replace function public.sin_chat_entre_vecinos()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  -- Lo que escribe la base por su cuenta (clave de servicio) no es un vecino.
  if auth.uid() is null then
    return new;
  end if;
  if not public.puede_escribir_en_conversacion(new.conversacion_id) then
    raise exception 'En este edificio el chat entre vecinos está desactivado: en los canales solo escribe la administración.'
      using errcode = 'check_violation',
            constraint = 'mensaje_sin_chat_entre_vecinos';
  end if;
  return new;
end;
$function$;

revoke all on function public.sin_chat_entre_vecinos() from public;

drop trigger if exists mensaje_sin_chat_entre_vecinos on public.mensaje;
create trigger mensaje_sin_chat_entre_vecinos
  before insert on public.mensaje
  for each row execute function public.sin_chat_entre_vecinos();

-- 4. Una conversación directa: solo la administración, salvo que el edificio
--    abra el chat entre vecinos. Hoy la política ya no deja crearlas desde la
--    app; esto lo deja escrito en la base por si una función nueva lo intenta.
create or replace function public.directa_sin_chat_entre_vecinos()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if new.tipo <> 'directa' or auth.uid() is null then
    return new;
  end if;
  if public.es_admin_condominio(new.condominio_id) then
    return new;
  end if;
  if coalesce((select c.chat_entre_vecinos from public.condominio c where c.id = new.condominio_id), false) then
    return new;
  end if;
  raise exception 'En este edificio el chat entre vecinos está desactivado.'
    using errcode = 'check_violation',
          constraint = 'conversacion_sin_chat_entre_vecinos';
end;
$function$;

revoke all on function public.directa_sin_chat_entre_vecinos() from public;

drop trigger if exists conversacion_sin_chat_entre_vecinos on public.conversacion;
create trigger conversacion_sin_chat_entre_vecinos
  before insert on public.conversacion
  for each row execute function public.directa_sin_chat_entre_vecinos();
