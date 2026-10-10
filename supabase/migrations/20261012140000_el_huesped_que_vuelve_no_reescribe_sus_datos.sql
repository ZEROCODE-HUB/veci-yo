-- El huesped que ya se alojo no vuelve a escribir sus datos.
--
-- Aditiva: una funcion.
--
-- Lo pidio el cliente el 09/10/2026: quien crea su cuenta al terminar un
-- preregistro deberia encontrarse, la proxima vez, con sus datos puestos.
--
-- No hace falta copiar nada a ningun sitio. Cuando el huesped acepta su acceso
-- y crea la cuenta, su ficha de esa estancia queda enlazada a el
-- (`invitado.usuario_id`, lo pone `enlazar_cuenta_con_estancia`). Sus datos ya
-- estan: lo que faltaba era poder **pedirlos**.
--
-- Devuelve la ficha mas reciente de quien llama, y nada de nadie mas: no
-- recibe ningun identificador, solo mira `auth.uid()`.

create or replace function public.mis_datos_para_precheckin()
returns table (
  nombre             text,
  apellidos          text,
  tipo_documento     text,
  documento          text,
  correo             text,
  telefono           text,
  codigo_pais        text,
  direccion          text,
  fecha_nacimiento   date,
  ciudad_residencia  text,
  ciudad_procedencia text
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp', 'auth'
as $$
  with ultima as (
    select i.*
    from public.invitado i
    where i.usuario_id = auth.uid()
    order by i.created_at desc
    limit 1
  )
  /*
    La ficha de su ultima estancia, y donde no llegue, el perfil de su cuenta.
    El correo es el de la cuenta: es con el que se le va a emitir el acceso, y
    `aceptar_invitacion` exige que coincida.
  */
  select
    coalesce(u.nombre, p.nombre),
    coalesce(u.apellidos, p.apellido),
    coalesce(u.tipo_documento::text, p.tipo_documento::text),
    coalesce(u.documento_numero, p.identificacion),
    (select lower(a.email) from auth.users a where a.id = auth.uid()),
    coalesce(u.telefono, p.telefono),
    coalesce(u.codigo_pais, p.codigo_pais),
    u.direccion,
    u.fecha_nacimiento,
    u.ciudad_residencia,
    u.ciudad_procedencia
  from (select auth.uid() as id) yo
  left join ultima u on true
  left join public.perfil p on p.id = yo.id
  where yo.id is not null;
$$;

comment on function public.mis_datos_para_precheckin() is
  'Los datos de la ultima estancia de quien llama, para no hacerselos '
  'escribir otra vez. No recibe a quien mirar: solo a si mismo.';

revoke execute on function public.mis_datos_para_precheckin() from public, anon;
grant execute on function public.mis_datos_para_precheckin() to authenticated;

notify pgrst, 'reload schema';
