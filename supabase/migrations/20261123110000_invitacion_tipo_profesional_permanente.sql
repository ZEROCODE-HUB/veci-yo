-- ============================================================================
-- La invitación del profesional permanente, como las demás (23/11/2026) · 1/2
-- ============================================================================
-- El cliente: «¿por qué no usas las invitaciones normales para el profesional
-- permanente? Eso ya funcionaba en otros roles». Tenía un correo propio sin
-- código, así que el registro no se llenaba con lo que escribió quien lo
-- invitó. Pasa a ser un ámbito más de `invitacion`.
--
-- El valor nuevo del enum va solo en este archivo: Postgres no deja usarlo en
-- la misma transacción en que se crea.

alter type public.ambito_invitacion add value if not exists 'trabajador';
