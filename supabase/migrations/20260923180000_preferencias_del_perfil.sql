-- ----------------------------------------------------------------------------
-- Las preferencias dejan de vivir en memoria
-- ----------------------------------------------------------------------------
-- La pantalla de Configuracion guarda todo en un store de Zustand: el codigo
-- de pais, el telefono, el correo alternativo, si las notificaciones van a
-- datos alternativos, y las tres casillas de apariencia. Nada de eso sobrevive
-- a cerrar la aplicacion (R-29).
--
-- Dos de esos datos no son una preferencia de pantalla: **a donde mandar las
-- notificaciones**. Si el envio de correo se enciende manana, el servidor
-- tiene que saber a que direccion escribir, y hoy esa direccion solo existe en
-- el telefono de quien la escribio.
--
-- Las columnas van en `perfil` porque son de la persona, no de la vivienda ni
-- del condominio: alguien que vive en dos edificios quiere sus notificaciones
-- en el mismo sitio.

alter table public.perfil
  add column if not exists codigo_pais       text,
  add column if not exists usar_contacto_alt boolean not null default false,
  add column if not exists telefono_alt      text,
  add column if not exists correo_alt        text,
  -- Apariencia. Se guardan aunque la aplicacion todavia no las aplique: la
  -- alternativa era seguir perdiendolas, y el dia que se apliquen ya estan.
  add column if not exists modo_daltonico    boolean not null default false,
  add column if not exists fuente_aumentada  boolean not null default false,
  add column if not exists modo_oscuro       boolean not null default false;

comment on column public.perfil.usar_contacto_alt is
  'Si las notificaciones van al telefono y correo alternativos en vez de a los principales.';

comment on column public.perfil.modo_daltonico is
  'Preferencia de apariencia. Se guarda; aplicarla en la interfaz esta pendiente (R-29).';

-- Un correo alternativo que no es un correo no sirve para lo unico que existe.
alter table public.perfil
  drop constraint if exists perfil_correo_alt_valido;
alter table public.perfil
  add constraint perfil_correo_alt_valido
  check (correo_alt is null or correo_alt ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- Y pedir que las notificaciones vayan a otro sitio sin decir a cual, tampoco.
alter table public.perfil
  drop constraint if exists perfil_contacto_alt_completo;
alter table public.perfil
  add constraint perfil_contacto_alt_completo
  check (
    not usar_contacto_alt
    or correo_alt is not null
    or telefono_alt is not null
  );
