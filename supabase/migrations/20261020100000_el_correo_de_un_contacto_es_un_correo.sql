-- El correo de un contacto del edificio (equipo, empresa de seguridad, de
-- limpieza) es opcional, pero si se escribe tiene que ser un correo. Se
-- guardaba cualquier texto (Para Claude, 20/10/2026). Mismo patrón que
-- `perfil.correo_alt` y las invitaciones.

alter table public.contacto_condominio
  add constraint contacto_condominio_correo_valido
  check (correo is null or correo ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]{2,}$')
  not valid;

-- Los que hay sin «@» los dejó quien probaba, quitándolo para ver si se
-- validaba. Sin vaciarlos la restricción no se puede validar, y una que
-- nadie valida rompe la edición de esas filas más adelante (AGENTS.md).
update public.contacto_condominio
set correo = null
where correo is not null
  and correo !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]{2,}$';

alter table public.contacto_condominio
  validate constraint contacto_condominio_correo_valido;
