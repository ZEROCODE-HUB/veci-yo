-- ----------------------------------------------------------------------------
-- La imagen de una zona va a alguna parte
-- ----------------------------------------------------------------------------
-- `zona_comun.imagen_path` se **lee** --`zonas.repo.ts:129`-- y no la escribe
-- nadie. El administrador abre la configuracion de una zona, pulsa «Subir
-- imagen personalizada», elige una foto, la ve en la vista previa, guarda... y
-- no se guarda. Al volver a entrar no esta.
--
-- Lo que pasaba por dentro: `ImageUploadCard` devuelve el **uri local del
-- dispositivo** --`file:///...` en el telefono, `blob:` en el navegador-- y
-- eso se metia en el formulario y moria ahi. Ni siquiera habia bucket donde
-- ponerla: los cuatro que existen son `pqrs`, `reglamentos`, `reservas` y
-- `visitas`.
--
-- Es el mismo patron de siempre --una columna que existe y nadie escribe-- y
-- salio al ir a añadir los requisitos de tamaño y formato que pidio el cliente
-- el 02/10/2026. Pedirlos tenia sentido justamente porque alguien lo estaba
-- intentando.
--
-- ----------------------------------------------------------------------------
-- Privado, como los otros cuatro
-- ----------------------------------------------------------------------------
-- Publico habria sido mas comodo --se pinta con la URL y ya-- pero la foto del
-- gimnasio enseña el interior del edificio, y un bucket publico lo deja a la
-- vista de cualquiera que adivine la ruta. Se mira con URL firmada, igual que
-- el comprobante de una reserva.
--
-- Aditiva.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zonas',
  'zonas',
  false,
  -- Cinco megas. La tarjeta decia ocho y no lo comprobaba nadie del lado del
  -- servidor: aqui si, y es el limite que de verdad manda.
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Quien puede verla: cualquiera del condominio al que pertenece la zona.
-- La ruta empieza por el uuid de la zona, como las fotos de visita empiezan
-- por el de la visita.

create or replace function public.puede_ver_zona(p_zona_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.zona_comun z
    where z.id = p_zona_id
      and (
        public.es_miembro_condominio(z.condominio_id)
        -- El huesped tambien: reserva zonas, asi que necesita verlas.
        or public.es_huesped_del_condominio(z.condominio_id)
      )
  );
$$;

comment on function public.puede_ver_zona is
  'Si esta persona puede ver esa zona comun. Incluye al huesped temporal: reserva zonas, asi que tiene que poder verlas.';

grant execute on function public.puede_ver_zona(uuid) to authenticated;

create or replace function public.puede_configurar_zona(p_zona_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.zona_comun z
    where z.id = p_zona_id and public.es_admin_condominio(z.condominio_id)
  );
$$;

comment on function public.puede_configurar_zona is
  'Solo la administracion cambia la foto de una zona comun.';

grant execute on function public.puede_configurar_zona(uuid) to authenticated;

drop policy if exists "zonas_lectura_imagen" on storage.objects;

create policy "zonas_lectura_imagen"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'zonas'
    and public.puede_ver_zona(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "zonas_alta_imagen" on storage.objects;

create policy "zonas_alta_imagen"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'zonas'
    and public.puede_configurar_zona(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "zonas_cambio_imagen" on storage.objects;

create policy "zonas_cambio_imagen"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'zonas'
    and public.puede_configurar_zona(((storage.foldername(name))[1])::uuid)
  );

-- ----------------------------------------------------------------------------
-- Y el icono, que es otra cosa
-- ----------------------------------------------------------------------------
-- El cliente pidio tambien una **galeria de iconos**. Hoy el icono de una zona
-- sale de su `tipo` --hay ocho en `assets/icons/zonas`-- asi que dos zonas del
-- mismo tipo se ven identicas y una zona de un tipo raro se queda sin ninguno.
--
-- `emoji` existe en la tabla desde el primer dia y **tampoco la escribe nadie**.
-- Se reusa para esto: guarda la **clave** del icono elegido --`piscina`,
-- `bbq`...-- y no un emoji. El nombre de la columna se queda como esta: un
-- `rename` obligaria a tocar las tres funciones que la devuelven, y lo que
-- importa es que por fin signifique algo.

comment on column public.zona_comun.emoji is
  'La clave del icono elegido de la galeria (`piscina`, `bbq`, `gym`...). Se llama `emoji` por historia: nacio para guardar uno y nunca se uso. Si esta vacia, el icono se deduce del tipo, que es lo que se hacia antes.';
