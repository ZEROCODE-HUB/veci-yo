-- ----------------------------------------------------------------------------
-- El calendario del alojamiento
-- ----------------------------------------------------------------------------
-- Airbnb no da API a un anfitrion suelto. Lo unico que publica es el enlace de
-- su calendario, y lo que ese enlace trae es poco pero suficiente para el
-- reparto que se decidio el 02/10/2026:
--
--   · las **fechas** de entrada y salida;
--   · un **identificador** estable del evento;
--   · y el **codigo de la reserva**, escondido dentro de la URL del portal.
--
-- Lo que NO trae: nombre del huesped, correo, telefono completo, ni cuantas
-- personas son. De ahi el reparto: el calendario pone las fechas y el codigo,
-- el anfitrion pone **cuantos adultos, cuantos niños y si traen vehiculo**, y
-- todo lo demas lo rellena el huesped en su preregistro.
--
-- ----------------------------------------------------------------------------
-- El campo ya estaba. Lo que faltaba era que alguien lo leyera
-- ----------------------------------------------------------------------------
-- `suscripcion_renta_corta.ical_url` existe desde el 23/09/2026, la pantalla de
-- «Huespedes Temporales» lo guarda y `guardar_alojamiento` lo escribe. **Nadie
-- lo lee.** Es la misma familia que `ocultar_contacto`: una columna que se
-- puede escribir y que no mueve nada, y que mientras tanto le dice al anfitrion
-- que su calendario esta conectado.
--
-- Asi que aqui no se crea otra columna --dos sitios para el mismo enlace es la
-- segunda fuente de verdad que prohibe la regla 1-- sino lo que le faltaba:
-- cuando se leyo por ultima vez, que fallo, y donde cae lo que entra.
--
-- Solo aditiva.

alter table public.suscripcion_renta_corta
  add column if not exists ical_sincronizado_en timestamptz,
  add column if not exists ical_error           text;

comment on column public.suscripcion_renta_corta.ical_url is
  'Enlace iCalendar del portal (Airbnb y compañia). Lo pega el anfitrion y lo lee la funcion que sincroniza.';
comment on column public.suscripcion_renta_corta.ical_sincronizado_en is
  'Cuando se leyo por ultima vez con exito.';
comment on column public.suscripcion_renta_corta.ical_error is
  'Por que fallo la ultima lectura. Se enseña al anfitrion: un calendario que dejo de funcionar en silencio es una reserva que nadie espera en la porteria.';


-- ----------------------------------------------------------------------------
-- Que el enlace sea un enlace de calendario
-- ----------------------------------------------------------------------------
-- El error facil es pegar la direccion del **anuncio** en vez de la del
-- calendario: en Airbnb las dos salen de la misma pantalla. Y el sintoma de
-- equivocarse --cero reservas-- no se parece en nada a la causa.
--
-- Va en un disparador y no en un `check` porque hay filas vivas y un `check`
-- las validaria todas de golpe.

create or replace function public.revisar_ical_url()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.ical_url is null or btrim(new.ical_url) = '' then
    new.ical_url := null;
    return new;
  end if;

  new.ical_url := btrim(new.ical_url);

  if new.ical_url !~* '^https?://' then
    raise exception 'El enlace del calendario tiene que empezar por http:// o https://';
  end if;

  -- `.ics`, o una ruta que diga `ical`: es como lo publican todos los portales.
  if new.ical_url !~* '\.ics(\?|$)' and new.ical_url !~* 'ical' then
    raise exception 'Ese no parece el enlace del calendario. En Airbnb esta en Calendario > Disponibilidad > Sincronizar calendarios > Exportar calendario, y termina en .ics';
  end if;

  return new;
end;
$$;

drop trigger if exists revisar_ical_url on public.suscripcion_renta_corta;
create trigger revisar_ical_url
  before insert or update of ical_url on public.suscripcion_renta_corta
  for each row execute function public.revisar_ical_url();


-- ----------------------------------------------------------------------------
-- De donde viene una estancia
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'origen_reserva') then
    create type public.origen_reserva as enum ('veciyo', 'calendario');
  end if;
end $$;

alter table public.visita
  add column if not exists origen         public.origen_reserva not null default 'veciyo',
  add column if not exists codigo_reserva text,
  add column if not exists calendario_uid text,
  add column if not exists calendario_url text;

comment on column public.visita.origen is
  'veciyo: la creo una persona desde la aplicacion. calendario: entro sola desde el iCal del portal.';
comment on column public.visita.codigo_reserva is
  'El codigo con el que el portal identifica la reserva. Viaja dentro de la URL del evento, no en un campo propio.';
comment on column public.visita.calendario_uid is
  'El UID del evento en el calendario. Es lo que impide duplicar al volver a leerlo.';

/*
  La llave contra los duplicados.

  Leer el calendario es algo que pasa muchas veces sobre los mismos eventos. Sin
  esto, cada lectura crearia otra estancia y la porteria acabaria con seis
  huespedes donde hay uno.
*/
create unique index if not exists visita_calendario_uid_unico
  on public.visita (unidad_id, calendario_uid)
  where calendario_uid is not null;

-- Por aqui busca el anfitrion cuando el huesped le escribe citando su codigo.
create index if not exists visita_codigo_reserva_idx
  on public.visita (codigo_reserva)
  where codigo_reserva is not null;


-- ----------------------------------------------------------------------------
-- Lo que la sincronizacion necesita preguntar
-- ----------------------------------------------------------------------------
-- La funcion que lee el calendario corre con la clave de servicio --tiene que
-- escribir sin sesion-- asi que **no** puede apoyarse en RLS para saber si
-- quien la invoco manda sobre esa vivienda. Se lo pregunta aqui, con la sesion
-- de quien llama.

create or replace function public.calendario_de_unidad(p_unidad_id uuid)
returns table (url text, condominio_id uuid, sincronizado_en timestamptz, error text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.puede_operar_unidad(p_unidad_id) then
    raise exception 'Esa vivienda no es tuya';
  end if;

  return query
  select s.ical_url, u.condominio_id, s.ical_sincronizado_en, s.ical_error
  from public.unidad u
  left join public.suscripcion_renta_corta s on s.unidad_id = u.id
  where u.id = p_unidad_id;
end;
$$;

comment on function public.calendario_de_unidad is
  'El enlace del calendario de una vivienda y como fue la ultima lectura. Lo usa la funcion que sincroniza, que corre sin sesion y no puede preguntarselo a RLS.';

grant execute on function public.calendario_de_unidad(uuid) to authenticated;
