-- A quien escribe alguien que necesita ayuda, y que se cambie desde la base.
--
-- Aditiva: dos ajustes nuevos y una funcion. No se borra nada.
--
-- La web del preregistro enlazaba «Soporte» a una direccion que no existia, y
-- se retiro el 10/10/2026. El cliente lo decidio el 11/10/2026: que vuelva, y
-- que el correo y el WhatsApp de soporte se cambien **desde la base**, sin
-- desplegar nada.

/*
  Vacios a proposito. `valor` no admite nulos, asi que «sin configurar» es la
  cadena vacia: mientras los dos esten vacios, la web no enseña el enlace.
  Un contacto inventado es peor que ninguno.
*/
insert into public.configuracion_plataforma (clave, valor, descripcion) values
  ('soporte_correo', '',
   'El correo al que escribe quien necesita ayuda. Vacio: no se ofrece.'),
  ('soporte_whatsapp', '',
   'El WhatsApp de soporte, con indicativo de pais (573001234567). Vacio: no se ofrece.')
on conflict (clave) do nothing;

/*
  La tabla solo la lee quien opera la plataforma, y asi sigue. Esto abre
  **dos claves y nada mas**, escritas aqui una por una: quien llama no elige
  cual. `valor_configuracion` sigue sin concederse a nadie.

  Lo usa un huesped sin cuenta, a mitad de su preregistro: por eso `anon`.
*/
create or replace function public.contacto_de_soporte()
returns table (correo text, whatsapp text)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    nullif(btrim((select c.valor from public.configuracion_plataforma c
                   where c.clave = 'soporte_correo')), ''),
    -- Solo digitos: es lo que pide un enlace de WhatsApp, lo teclee como lo teclee.
    nullif(regexp_replace(coalesce((select c.valor from public.configuracion_plataforma c
                                     where c.clave = 'soporte_whatsapp'), ''),
                          '\D', '', 'g'), '');
$$;

comment on function public.contacto_de_soporte() is
  'El correo y el WhatsApp de soporte de la plataforma, o nulo el que no este '
  'configurado. Publica: la lee un huesped sin cuenta. No abre ningun otro ajuste.';

revoke execute on function public.contacto_de_soporte() from public;
grant execute on function public.contacto_de_soporte() to anon, authenticated, service_role;
