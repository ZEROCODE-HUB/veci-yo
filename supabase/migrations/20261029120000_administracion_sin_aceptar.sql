-- La administración de un edificio se asigna sin aceptar (29/10/2026).
--
-- El cliente: «es mucha vaina» que el primer administrador tenga que aceptar
-- una invitación. Ahora el panel de la app lo vincula directamente y le avisa
-- por correo. Lo hace la función de servidor `vincular-administracion`, que
-- necesita la API de administración (crear la cuenta si no existe) y por eso
-- vive fuera de la base. Aquí solo lo que esa función le pregunta a la base.
--
-- Solo aditiva: las invitaciones de antes se quedan como estaban.

-- La cuenta de un correo, para no crear otra si ya existe. Solo la clave de
-- servicio: con una sesión cualquiera serviría para saber quién tiene cuenta.
create or replace function public.cuenta_por_correo(p_correo text)
returns uuid
language sql
stable
security definer
set search_path to 'public', 'pg_temp', 'auth'
as $$
  select id from auth.users where lower(email) = lower(btrim(p_correo)) limit 1;
$$;
comment on function public.cuenta_por_correo(text) is
  'La cuenta que tiene ese correo, o null. Solo la usa la función vincular-administracion, con la clave de servicio.';
revoke execute on function public.cuenta_por_correo(text) from public, anon, authenticated;
grant execute on function public.cuenta_por_correo(text) to service_role;
