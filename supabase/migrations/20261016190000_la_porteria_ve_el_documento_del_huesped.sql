-- ============================================================================
-- La portería ve el documento que subió el huésped
-- ============================================================================
-- El 09/10/2026 se decidió con el cliente que la foto del documento que sube el
-- huésped era del anfitrión y no de la portería (`archivo_vedado_a_porteria`).
--
-- La responsable de producto lo cambió el 16/10/2026: «al guardia, en el
-- registro de entrada, le muestra el documento guardado y le pide confirmar
-- que son la misma persona». Así que la portería la ve, con el mismo límite que
-- el resto de la visita: `puede_ver_visita`, o sea su ventana de hoy, mañana y
-- quien está dentro. Una visita de dentro de un mes, no.
--
-- La función se queda (la llama la política) y ya no veda nada. No se borra
-- ningún dato ni ninguna política.

create or replace function public.archivo_vedado_a_porteria(p_nombre text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'storage', 'pg_temp'
as $$
  select false;
$$;

comment on function public.archivo_vedado_a_porteria(text) is
  'Desde el 16/10/2026 no veda nada: la porteria ve el documento del huesped '
  'para confirmar en la entrada que es la misma persona. El limite de fechas '
  'lo pone puede_ver_visita en la misma politica.';
